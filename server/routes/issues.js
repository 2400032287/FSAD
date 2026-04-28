import { Router } from "express";
import { getPool } from "../db.js";

const router = Router();

const issueSelectQuery = `
  SELECT
    i.id,
    i.title,
    i.description,
    i.category,
    i.area,
    i.location,
    i.latitude,
    i.longitude,
    CASE
      WHEN i.status = 'Pending' THEN 'Open'
      ELSE i.status
    END AS status,
    COALESCE(latest_comment.response, '') AS response,
    DATE_FORMAT(COALESCE(latest_activity.updated_at, i.created_at), '%Y-%m-%d') AS updatedAt,
    i.citizen_id AS citizenId,
    i.citizen_name AS citizenName,
    i.assigned_role AS assignedRole,
    i.created_at AS createdAt
  FROM issues i
  LEFT JOIN (
    SELECT
      ic.issue_id,
      CONCAT(ic.author_name, ': ', ic.message) AS response
    FROM issue_comments ic
    INNER JOIN (
      SELECT issue_id, MAX(id) AS max_id
      FROM issue_comments
      GROUP BY issue_id
    ) latest ON latest.max_id = ic.id
  ) latest_comment ON latest_comment.issue_id = i.id
  LEFT JOIN (
    SELECT issue_id, MAX(created_at) AS updated_at
    FROM (
      SELECT issue_id, created_at FROM issue_comments
      UNION ALL
      SELECT issue_id, created_at FROM issue_history
    ) activity
    GROUP BY issue_id
  ) latest_activity ON latest_activity.issue_id = i.id
`;

async function getIssueById(pool, id) {
  const [rows] = await pool.query(`${issueSelectQuery} WHERE i.id = ?`, [id]);
  return rows[0] ?? null;
}

router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const [issues] = await pool.query(`${issueSelectQuery} ORDER BY i.id DESC`);
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: "Failed to load issues" });
  }
});

router.post("/", async (req, res) => {
  const {
    title,
    description,
    category = "General",
    area = "Unknown Area",
    location = "",
    latitude = "",
    longitude = "",
    citizenId,
    citizenName,
  } = req.body;

  if (!title || !description || !citizenId || !citizenName) {
    return res.status(400).json({ message: "Missing required issue fields" });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `
      INSERT INTO issues
        (title, description, category, area, location, latitude, longitude, status, citizen_id, citizen_name, assigned_role)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 'politician')
      `,
      [title, description, category, area, location, latitude, longitude, citizenId, citizenName]
    );

    await pool.query(
      "INSERT INTO issue_history (issue_id, message, status, actor) VALUES (?, 'Issue created', 'Pending', ?)",
      [result.insertId, citizenName]
    );

    const issue = await getIssueById(pool, result.insertId);
    res.status(201).json(issue);
  } catch (error) {
    res.status(500).json({ message: "Failed to create issue" });
  }
});

router.patch("/:id/respond", async (req, res) => {
  const id = Number(req.params.id);
  const { response, status, politician } = req.body;

  if (!response || !politician) {
    return res.status(400).json({ message: "Response and politician are required" });
  }

  const nextStatus = status === "Open" ? "Pending" : status || "In Progress";

  try {
    const pool = getPool();
    const [result] = await pool.query("UPDATE issues SET status = ? WHERE id = ?", [nextStatus, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const [politicianRows] = await pool.query(
      "SELECT id, name FROM users WHERE name = ? AND role = 'politician' LIMIT 1",
      [politician]
    );

    if (!politicianRows.length) {
      return res.status(400).json({ message: "Politician user not found" });
    }

    await pool.query(
      `
      INSERT INTO issue_comments (issue_id, author_id, author_name, author_role, message)
      VALUES (?, ?, ?, 'politician', ?)
      `,
      [id, politicianRows[0].id, politicianRows[0].name, response]
    );

    await pool.query(
      "INSERT INTO issue_history (issue_id, message, status, actor) VALUES (?, ?, ?, ?)",
      [id, "Politician response added", nextStatus, politician]
    );

    const issue = await getIssueById(pool, id);
    return res.json(issue);
  } catch (error) {
    return res.status(500).json({ message: "Failed to respond to issue" });
  }
});

router.patch("/:id/resolve", async (req, res) => {
  const id = Number(req.params.id);
  const { decision, note, moderator } = req.body;
  const nextStatus = decision === "Open" ? "Pending" : decision;

  if (!nextStatus || !moderator) {
    return res.status(400).json({ message: "Decision and moderator are required" });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query("UPDATE issues SET status = ? WHERE id = ?", [nextStatus, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    if (note) {
      await pool.query(
        "INSERT INTO issue_history (issue_id, message, status, actor) VALUES (?, ?, ?, ?)",
        [id, `Moderator note: ${note}`, nextStatus, moderator]
      );
    }

    await pool.query(
      "INSERT INTO issue_history (issue_id, message, status, actor) VALUES (?, ?, ?, ?)",
      [id, "Moderator updated issue status", nextStatus, moderator]
    );

    const issue = await getIssueById(pool, id);
    return res.json(issue);
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve issue" });
  }
});

export default router;
