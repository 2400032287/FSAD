import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, initializeDatabase } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "project8-demo-secret";
const uploadDirectory = path.join(__dirname, "uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) =>
    callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDirectory));

function categorizeIssue(text) {
  const sample = String(text).toLowerCase();
  if (
    sample.includes("water") ||
    sample.includes("pipe") ||
    sample.includes("drain") ||
    sample.includes("leak")
  ) {
    return "Water";
  }
  if (
    sample.includes("light") ||
    sample.includes("electric") ||
    sample.includes("power") ||
    sample.includes("current")
  ) {
    return "Electricity";
  }
  if (
    sample.includes("road") ||
    sample.includes("pothole") ||
    sample.includes("street") ||
    sample.includes("traffic")
  ) {
    return "Road";
  }
  return "General";
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    area: user.area,
    language: user.language,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await getPool().query("SELECT * FROM users WHERE id = ?", [payload.id]);
    if (!rows.length) {
      return res.status(401).json({ message: "User account no longer exists." });
    }
    req.user = rows[0];
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this action." });
    }
    next();
  };
}

async function accessibleIssues(user, filters = {}) {
  const clauses = [];
  const values = [];

  if (user.role === "politician") {
    clauses.push("i.area = ?");
    values.push(user.area);
  }

  if (filters.status) {
    clauses.push("i.status = ?");
    values.push(filters.status);
  }

  if (filters.area) {
    clauses.push("i.area = ?");
    values.push(filters.area);
  }

  if (filters.category) {
    clauses.push("i.category = ?");
    values.push(filters.category);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await getPool().query(
    `
    SELECT
      i.*,
      COUNT(DISTINCT iu.user_id) AS upvote_count
    FROM issues i
    LEFT JOIN issue_upvotes iu ON iu.issue_id = i.id
    ${whereClause}
    GROUP BY i.id
    ORDER BY i.created_at DESC
    `,
    values
  );

  return Promise.all(rows.map((row) => hydrateIssue(row, user.id)));
}

async function hydrateIssue(issueRow, currentUserId) {
  const pool = getPool();
  const [mediaRows] = await pool.query(
    "SELECT file_name, file_url, mime_type FROM issue_media WHERE issue_id = ? ORDER BY id ASC",
    [issueRow.id]
  );
  const [commentRows] = await pool.query(
    `
    SELECT id, author_id, author_name, author_role, message, created_at
    FROM issue_comments
    WHERE issue_id = ?
    ORDER BY created_at ASC
    `,
    [issueRow.id]
  );
  const [historyRows] = await pool.query(
    `
    SELECT id, message, status, actor, created_at
    FROM issue_history
    WHERE issue_id = ?
    ORDER BY created_at ASC
    `,
    [issueRow.id]
  );
  const [upvoteRows] = await pool.query(
    "SELECT user_id FROM issue_upvotes WHERE issue_id = ?",
    [issueRow.id]
  );

  return {
    id: issueRow.id,
    title: issueRow.title,
    description: issueRow.description,
    category: issueRow.category,
    area: issueRow.area,
    location: issueRow.location,
    latitude: issueRow.latitude,
    longitude: issueRow.longitude,
    status: issueRow.status,
    citizenId: issueRow.citizen_id,
    citizenName: issueRow.citizen_name,
    assignedRole: issueRow.assigned_role,
    createdAt: issueRow.created_at,
    upvotes: upvoteRows.map((item) => item.user_id),
    userHasUpvoted: upvoteRows.some((item) => item.user_id === currentUserId),
    media: mediaRows.map((item) => ({
      name: item.file_name,
      url: item.file_url,
      mimetype: item.mime_type,
    })),
    comments: commentRows.map((item) => ({
      id: item.id,
      authorId: item.author_id,
      authorName: item.author_name,
      authorRole: item.author_role,
      message: item.message,
      createdAt: item.created_at,
    })),
    history: historyRows.map((item) => ({
      id: item.id,
      message: item.message,
      status: item.status,
      actor: item.actor,
      createdAt: item.created_at,
    })),
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      issueRow.location || `${issueRow.latitude},${issueRow.longitude}`
    )}`,
  };
}

async function issueByIdForUser(id, user) {
  const [rows] = await getPool().query("SELECT * FROM issues WHERE id = ?", [id]);
  if (!rows.length) {
    return null;
  }

  const issue = rows[0];
  if (user.role === "politician" && issue.area !== user.area) {
    return null;
  }

  return hydrateIssue(issue, user.id);
}

async function pushNotification(userId, message) {
  await getPool().query(
    "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, FALSE)",
    [userId, message]
  );
}

function issueStats(list) {
  const total = list.length;
  const pending = list.filter((issue) => issue.status === "Pending").length;
  const inProgress = list.filter((issue) => issue.status === "In Progress").length;
  const resolved = list.filter((issue) => issue.status === "Resolved").length;

  const categories = ["Road", "Water", "Electricity", "General"].map((category) => ({
    category,
    count: list.filter((issue) => issue.category === category).length,
  }));

  return { total, pending, inProgress, resolved, categories };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role, area, language } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password, and role are required." });
  }

  if (!["citizen", "politician"].includes(role)) {
    return res.status(400).json({ message: "Role must be citizen or politician." });
  }

  const pool = getPool();
  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const [result] = await pool.query(
    `
    INSERT INTO users (name, email, password_hash, role, area, language)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [name, email, passwordHash, role, area || "General Area", language || "en"]
  );

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
  const user = rows[0];

  res.status(201).json({
    token: createToken(user),
    user: toPublicUser(user),
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  const [rows] = await getPool().query("SELECT * FROM users WHERE email = ?", [email]);

  if (!rows.length || !bcrypt.compareSync(password || "", rows[0].password_hash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (role && rows[0].role !== role) {
    return res.status(401).json({ message: "Selected role does not match this account." });
  }

  res.json({
    token: createToken(rows[0]),
    user: toPublicUser(rows[0]),
  });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

app.get("/api/dashboard", authenticate, async (req, res) => {
  const list = await accessibleIssues(req.user);
  const historyQuery =
    req.user.role === "citizen"
      ? "SELECT id, title, status, category, created_at FROM issues WHERE citizen_id = ? ORDER BY created_at DESC"
      : "SELECT id, title, status, category, created_at FROM issues WHERE area = ? ORDER BY created_at DESC";
  const historyValue = req.user.role === "citizen" ? req.user.id : req.user.area;
  const [historyRows] = await getPool().query(historyQuery, [historyValue]);
  const [notificationRows] = await getPool().query(
    "SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );

  res.json({
    user: toPublicUser(req.user),
    stats: issueStats(list),
    issues: list,
    notifications: notificationRows.map((item) => ({
      id: item.id,
      message: item.message,
      read: Boolean(item.is_read),
      createdAt: item.created_at,
    })),
    history: historyRows.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      category: item.category,
      createdAt: item.created_at,
    })),
  });
});

app.get("/api/issues", authenticate, async (req, res) => {
  const list = await accessibleIssues(req.user, req.query);
  res.json({ issues: list });
});

app.get("/api/issues/:id", authenticate, async (req, res) => {
  const issue = await issueByIdForUser(Number(req.params.id), req.user);
  if (!issue) {
    return res.status(404).json({ message: "Issue not found." });
  }
  res.json({ issue });
});

app.post(
  "/api/issues",
  authenticate,
  requireRole("citizen"),
  upload.array("media", 3),
  async (req, res) => {
    const { title, description, location, area, latitude, longitude } = req.body;

    if (!title || !description || !location || !area) {
      return res
        .status(400)
        .json({ message: "Title, description, location, and area are required." });
    }

    const category = categorizeIssue(`${title} ${description}`);
    const [result] = await getPool().query(
      `
      INSERT INTO issues
        (title, description, category, area, location, latitude, longitude, status, citizen_id, citizen_name, assigned_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 'politician')
      `,
      [
        title,
        description,
        category,
        area,
        location,
        latitude || "",
        longitude || "",
        req.user.id,
        req.user.name,
      ]
    );

    if (req.files?.length) {
      const mediaValues = req.files.map((file) => [
        result.insertId,
        file.originalname,
        `http://localhost:${PORT}/uploads/${file.filename}`,
        file.mimetype,
      ]);
      await getPool().query(
        `
        INSERT INTO issue_media (issue_id, file_name, file_url, mime_type)
        VALUES ?
        `,
        [mediaValues]
      );
    }

    await getPool().query(
      `
      INSERT INTO issue_history (issue_id, message, status, actor)
      VALUES (?, 'Issue created', 'Pending', ?)
      `,
      [result.insertId, req.user.name]
    );

    const [politicians] = await getPool().query(
      "SELECT id FROM users WHERE role = 'politician' AND area = ?",
      [area]
    );
    await Promise.all(
      politicians.map((user) =>
        pushNotification(user.id, `New ${category} issue reported in ${area}.`)
      )
    );

    const issue = await issueByIdForUser(result.insertId, req.user);
    res.status(201).json({ issue });
  }
);

app.post("/api/issues/:id/upvote", authenticate, requireRole("citizen"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await getPool().query(
    "SELECT issue_id FROM issue_upvotes WHERE issue_id = ? AND user_id = ?",
    [id, req.user.id]
  );

  if (existing.length) {
    await getPool().query(
      "DELETE FROM issue_upvotes WHERE issue_id = ? AND user_id = ?",
      [id, req.user.id]
    );
  } else {
    await getPool().query(
      "INSERT INTO issue_upvotes (issue_id, user_id) VALUES (?, ?)",
      [id, req.user.id]
    );
  }

  const [countRows] = await getPool().query(
    "SELECT COUNT(*) AS count FROM issue_upvotes WHERE issue_id = ?",
    [id]
  );

  res.json({ upvotes: countRows[0].count, active: !existing.length });
});

app.post("/api/issues/:id/comments", authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const issue = await issueByIdForUser(id, req.user);
  if (!issue) {
    return res.status(404).json({ message: "Issue not found." });
  }

  if (!req.body.message) {
    return res.status(400).json({ message: "Comment message is required." });
  }

  const [result] = await getPool().query(
    `
    INSERT INTO issue_comments (issue_id, author_id, author_name, author_role, message)
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, req.user.id, req.user.name, req.user.role, req.body.message]
  );

  if (req.user.role === "politician") {
    await pushNotification(issue.citizenId, `A politician responded to "${issue.title}".`);
  } else {
    const [politicians] = await getPool().query(
      "SELECT id FROM users WHERE role = 'politician' AND area = ?",
      [issue.area]
    );
    await Promise.all(
      politicians.map((user) =>
        pushNotification(user.id, `A citizen added a comment to "${issue.title}".`)
      )
    );
  }

  res.status(201).json({
    comment: {
      id: result.insertId,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      message: req.body.message,
      createdAt: new Date().toISOString(),
    },
  });
});

app.patch("/api/issues/:id/status", authenticate, requireRole("politician"), async (req, res) => {
  const id = Number(req.params.id);
  const issue = await issueByIdForUser(id, req.user);
  if (!issue) {
    return res.status(404).json({ message: "Issue not found." });
  }

  const { status } = req.body;
  if (!["Pending", "In Progress", "Resolved"].includes(status)) {
    return res.status(400).json({ message: "Invalid issue status." });
  }

  await getPool().query("UPDATE issues SET status = ? WHERE id = ?", [status, id]);
  await getPool().query(
    `
    INSERT INTO issue_history (issue_id, message, status, actor)
    VALUES (?, ?, ?, ?)
    `,
    [id, `Status changed to ${status}`, status, req.user.name]
  );
  await pushNotification(issue.citizenId, `Your complaint "${issue.title}" is now ${status}.`);

  const updated = await issueByIdForUser(id, req.user);
  res.json({ issue: updated });
});

app.get("/api/notifications", authenticate, async (req, res) => {
  const [rows] = await getPool().query(
    "SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );

  res.json({
    notifications: rows.map((item) => ({
      id: item.id,
      message: item.message,
      read: Boolean(item.is_read),
      createdAt: item.created_at,
    })),
  });
});

app.patch("/api/notifications/read", authenticate, async (req, res) => {
  await getPool().query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [req.user.id]);
  res.json({ message: "Notifications marked as read." });
});

async function startServer() {
  await initializeDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      resolve(server);
    });

    server.on("error", reject);
  });
}

export { app, startServer };

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  startServer().catch((error) => {
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  });
}
