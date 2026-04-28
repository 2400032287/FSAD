import { Router } from "express";
import { getPool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      "SELECT id, name, email, role, status, area, language, created_at FROM users ORDER BY id ASC"
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

router.patch("/:id/role", async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body;

  if (!["citizen", "politician"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, role, status, area, language, created_at FROM users WHERE id = ?",
      [id]
    );

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user role" });
  }
});

router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT status FROM users WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const nextStatus = rows[0].status === "active" ? "suspended" : "active";
    await pool.query("UPDATE users SET status = ? WHERE id = ?", [nextStatus, id]);

    const [updatedRows] = await pool.query(
      "SELECT id, name, email, role, status, area, language, created_at FROM users WHERE id = ?",
      [id]
    );

    return res.json(updatedRows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user status" });
  }
});

export default router;
