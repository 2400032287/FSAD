import { Router } from "express";
import { getPool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const [feedback] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        message,
        status,
        flagged,
        moderator_note AS moderatorNote,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS createdAt
      FROM feedback
      ORDER BY id DESC
      `
    );

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: "Failed to load feedback" });
  }
});

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Name, email, and message are required" });
  }

  const lowered = message.toLowerCase();
  const flagged = ["hate", "abuse", "threat"].some((word) =>
    lowered.includes(word),
  );

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `
      INSERT INTO feedback (name, email, message, status, flagged, moderator_note)
      VALUES (?, ?, ?, ?, ?, '')
      `,
      [name, email, message, flagged ? "Needs Review" : "Pending", flagged]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        message,
        status,
        flagged,
        moderator_note AS moderatorNote,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS createdAt
      FROM feedback
      WHERE id = ?
      `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

router.patch("/:id/moderate", async (req, res) => {
  const id = Number(req.params.id);
  const { action, moderatorNote, moderator } = req.body;

  if (!action || !moderator) {
    return res.status(400).json({ message: "Action and moderator are required" });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `
      UPDATE feedback
      SET flagged = ?, status = ?, moderator_note = ?
      WHERE id = ?
      `,
      [action !== "Approved", action, moderatorNote || "", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        message,
        status,
        flagged,
        moderator_note AS moderatorNote,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS createdAt
      FROM feedback
      WHERE id = ?
      `,
      [id]
    );

    await pool.query(
      `
      INSERT INTO moderation_log (actor, target, action, note)
      VALUES (?, ?, ?, ?)
      `,
      [moderator, `Feedback #${id}`, action, moderatorNote || ""]
    );

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to moderate feedback" });
  }
});

export default router;
