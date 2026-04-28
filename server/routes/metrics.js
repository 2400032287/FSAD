import { Router } from "express";
import { getPool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const [[totalIssuesRow]] = await pool.query("SELECT COUNT(*) AS count FROM issues");
    const [[openIssuesRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM issues WHERE status = 'Pending'"
    );
    const [[resolvedIssuesRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM issues WHERE status = 'Resolved'"
    );
    const [[pendingFeedbackRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM feedback WHERE status <> 'Approved'"
    );
    const [[totalUpdatesRow]] = await pool.query("SELECT COUNT(*) AS count FROM updates");
    const [[moderationActionsRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM moderation_log"
    );

    res.json({
      totalIssues: totalIssuesRow.count,
      openIssues: openIssuesRow.count,
      resolvedIssues: resolvedIssuesRow.count,
      pendingFeedback: pendingFeedbackRow.count,
      totalUpdates: totalUpdatesRow.count,
      moderationActions: moderationActionsRow.count,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load metrics" });
  }
});

export default router;
