import { useState } from "react";

export default function Politician({
  currentUser,
  issues,
  updates,
  respondToIssue,
  postUpdate,
}) {
  const politicianName = currentUser?.name ?? "Politician";
  const [replyForm, setReplyForm] = useState({
    issueId: "",
    response: "",
    status: "In Progress",
    politician: politicianName,
  });

  const [updateForm, setUpdateForm] = useState({
    title: "",
    message: "",
    audience: "All Citizens",
    author: politicianName,
  });

  const submitResponse = (event) => {
    event.preventDefault();
    const issueId = Number(replyForm.issueId);
    if (!issueId || !replyForm.response.trim()) return;
    respondToIssue({ ...replyForm, issueId, politician: politicianName });
    setReplyForm((prev) => ({
      ...prev,
      issueId: "",
      response: "",
      politician: politicianName,
    }));
  };

  const submitUpdate = (event) => {
    event.preventDefault();
    if (!updateForm.title.trim() || !updateForm.message.trim()) return;
    postUpdate({ ...updateForm, author: politicianName });
    setUpdateForm((prev) => ({
      ...prev,
      title: "",
      message: "",
      author: politicianName,
    }));
  };

  return (
    <div className="page">
      <h1>Politician Dashboard</h1>
      <p className="subtitle">
        Address citizen concerns, share policy updates, and improve responsiveness.
      </p>

      <section className="panel">
        <h3>Respond to Citizen Issue</h3>
        <form className="form-grid" onSubmit={submitResponse}>
          <select
            value={replyForm.issueId}
            onChange={(event) => setReplyForm({ ...replyForm, issueId: event.target.value })}
          >
            <option value="">Select issue</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                #{issue.id} - {issue.title}
              </option>
            ))}
          </select>
          <select
            value={replyForm.status}
            onChange={(event) => setReplyForm({ ...replyForm, status: event.target.value })}
          >
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Escalated</option>
          </select>
          <textarea
            rows={3}
            placeholder="Write a clear response for the citizen"
            value={replyForm.response}
            onChange={(event) => setReplyForm({ ...replyForm, response: event.target.value })}
          />
          <button type="submit">Post Response</button>
        </form>
      </section>

      <section className="panel">
        <h3>Publish Public Update</h3>
        <form className="form-grid" onSubmit={submitUpdate}>
          <input
            placeholder="Update title"
            value={updateForm.title}
            onChange={(event) => setUpdateForm({ ...updateForm, title: event.target.value })}
          />
          <select
            value={updateForm.audience}
            onChange={(event) => setUpdateForm({ ...updateForm, audience: event.target.value })}
          >
            <option>All Citizens</option>
            <option>Ward 1</option>
            <option>Ward 2</option>
            <option>Ward 3</option>
            <option>Ward 4</option>
          </select>
          <textarea
            rows={3}
            placeholder="Share progress or policy update"
            value={updateForm.message}
            onChange={(event) => setUpdateForm({ ...updateForm, message: event.target.value })}
          />
          <button type="submit">Post Update</button>
        </form>
      </section>

      <section className="panel">
        <h3>Issue Queue</h3>
        <div className="list-grid">
          {issues.slice(0, 6).map((issue) => (
            <article key={issue.id} className="list-card">
              <h4>
                #{issue.id} {issue.title}
              </h4>
              <p>{issue.description}</p>
              <p>
                {issue.createdBy} | {issue.location || "N/A"} | {issue.priority}
              </p>
              <p>Status: {issue.status}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Recent Posts</h3>
        <div className="list-grid">
          {updates.slice(0, 5).map((update) => (
            <article key={update.id} className="list-card">
              <h4>{update.title}</h4>
              <p>{update.message}</p>
              <p>Audience: {update.audience}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
