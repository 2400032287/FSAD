import { useState } from "react";

export default function Moderator({
  currentUser,
  feedback,
  issues,
  moderationLog,
  moderateFeedback,
  resolveIssue,
}) {
  const moderatorName = currentUser?.name ?? "Moderator";
  const [feedbackAction, setFeedbackAction] = useState({
    feedbackId: "",
    action: "Approved",
    moderatorNote: "",
    moderator: moderatorName,
  });

  const [issueAction, setIssueAction] = useState({
    issueId: "",
    decision: "Resolved",
    note: "",
    moderator: moderatorName,
  });

  const submitFeedbackAction = (event) => {
    event.preventDefault();
    const feedbackId = Number(feedbackAction.feedbackId);
    if (!feedbackId) return;
    moderateFeedback({ ...feedbackAction, feedbackId, moderator: moderatorName });
    setFeedbackAction((prev) => ({
      ...prev,
      feedbackId: "",
      moderatorNote: "",
      moderator: moderatorName,
    }));
  };

  const submitIssueAction = (event) => {
    event.preventDefault();
    const issueId = Number(issueAction.issueId);
    if (!issueId) return;
    resolveIssue({ ...issueAction, issueId, moderator: moderatorName });
    setIssueAction((prev) => ({
      ...prev,
      issueId: "",
      note: "",
      moderator: moderatorName,
    }));
  };

  return (
    <div className="page">
      <h1>Moderator Dashboard</h1>
      <p className="subtitle">
        Protect respectful discussions, handle flagged content, and resolve conflicts.
      </p>

      <section className="panel">
        <h3>Review Feedback</h3>
        <form className="form-grid" onSubmit={submitFeedbackAction}>
          <select
            value={feedbackAction.feedbackId}
            onChange={(event) =>
              setFeedbackAction({ ...feedbackAction, feedbackId: event.target.value })
            }
          >
            <option value="">Select feedback</option>
            {feedback.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} {item.type} ({item.status})
              </option>
            ))}
          </select>
          <select
            value={feedbackAction.action}
            onChange={(event) =>
              setFeedbackAction({ ...feedbackAction, action: event.target.value })
            }
          >
            <option>Approved</option>
            <option>Hidden</option>
            <option>Needs Review</option>
          </select>
          <textarea
            rows={3}
            placeholder="Add moderation note"
            value={feedbackAction.moderatorNote}
            onChange={(event) =>
              setFeedbackAction({ ...feedbackAction, moderatorNote: event.target.value })
            }
          />
          <button type="submit">Apply Feedback Action</button>
        </form>
      </section>

      <section className="panel">
        <h3>Resolve Issue Conflict</h3>
        <form className="form-grid" onSubmit={submitIssueAction}>
          <select
            value={issueAction.issueId}
            onChange={(event) => setIssueAction({ ...issueAction, issueId: event.target.value })}
          >
            <option value="">Select issue</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                #{issue.id} {issue.title} ({issue.status})
              </option>
            ))}
          </select>
          <select
            value={issueAction.decision}
            onChange={(event) => setIssueAction({ ...issueAction, decision: event.target.value })}
          >
            <option>Resolved</option>
            <option>Escalated</option>
            <option>Under Review</option>
          </select>
          <textarea
            rows={3}
            placeholder="Conflict resolution note"
            value={issueAction.note}
            onChange={(event) => setIssueAction({ ...issueAction, note: event.target.value })}
          />
          <button type="submit">Resolve Issue</button>
        </form>
      </section>

      <section className="panel">
        <h3>Flagged Conversations</h3>
        {feedback.filter((item) => item.flagged || item.status !== "Approved").length === 0 ? (
          <p>No flagged conversations at the moment.</p>
        ) : (
          <div className="list-grid">
            {feedback
              .filter((item) => item.flagged || item.status !== "Approved")
              .slice(0, 6)
              .map((item) => (
                <article key={item.id} className="list-card">
                  <h4>
                    Feedback #{item.id} - {item.type}
                  </h4>
                  <p>{item.message}</p>
                  <p>Status: {item.status}</p>
                  <p>{item.moderatorNote || "No moderator note."}</p>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Moderation Log</h3>
        {moderationLog.length === 0 ? (
          <p>No moderation actions recorded yet.</p>
        ) : (
          <div className="list-grid">
            {moderationLog.slice(0, 8).map((entry) => (
              <article key={entry.id} className="list-card">
                <h4>{entry.action}</h4>
                <p>{entry.target}</p>
                <p>{entry.note || "No note recorded."}</p>
                <p>Date: {entry.createdAt}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
