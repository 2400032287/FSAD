import { useState } from "react";

export default function Citizen({
  currentUser,
  issues,
  updates,
  feedback,
  addIssue,
  addFeedback,
}) {
  const issueOwner = currentUser?.name ?? "Citizen";
  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    category: "Infrastructure",
    location: "",
    priority: "Medium",
    createdBy: issueOwner,
  });
  const [feedbackForm, setFeedbackForm] = useState({
    message: "",
    type: "Suggestion",
    createdBy: issueOwner,
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const submitIssue = (event) => {
    event.preventDefault();
    if (!issueForm.title.trim() || !issueForm.description.trim()) return;
    addIssue({ ...issueForm, createdBy: issueOwner });
    setIssueForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      location: "",
      createdBy: issueOwner,
    }));
  };

  const submitFeedback = (event) => {
    event.preventDefault();
    if (!feedbackForm.message.trim()) return;
    addFeedback({ ...feedbackForm, createdBy: issueOwner });
    setFeedbackForm((prev) => ({ ...prev, message: "", createdBy: issueOwner }));
  };

  const visibleIssues = issues.filter((issue) => {
    const matchesQuery =
      issue.title.toLowerCase().includes(query.toLowerCase()) ||
      issue.description.toLowerCase().includes(query.toLowerCase()) ||
      (issue.location || "").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || issue.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page">
      <h1>Citizen Dashboard</h1>
      <p className="subtitle">
        Report local issues, share feedback, and follow elected representative updates.
      </p>

      <section className="panel">
        <h3>Report an Issue</h3>
        <form className="form-grid" onSubmit={submitIssue}>
          <input
            placeholder="Issue title"
            value={issueForm.title}
            onChange={(event) => setIssueForm({ ...issueForm, title: event.target.value })}
          />
          <select
            value={issueForm.category}
            onChange={(event) => setIssueForm({ ...issueForm, category: event.target.value })}
          >
            <option>Infrastructure</option>
            <option>Sanitation</option>
            <option>Safety</option>
            <option>Transport</option>
          </select>
          <input
            placeholder="Location / Ward"
            value={issueForm.location}
            onChange={(event) => setIssueForm({ ...issueForm, location: event.target.value })}
          />
          <select
            value={issueForm.priority}
            onChange={(event) => setIssueForm({ ...issueForm, priority: event.target.value })}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
          <textarea
            rows={3}
            placeholder="Describe the issue in detail"
            value={issueForm.description}
            onChange={(event) =>
              setIssueForm({ ...issueForm, description: event.target.value })
            }
          />
          <button type="submit">Submit Issue</button>
        </form>
      </section>

      <section className="panel">
        <h3>Provide Feedback</h3>
        <form className="form-grid" onSubmit={submitFeedback}>
          <select
            value={feedbackForm.type}
            onChange={(event) => setFeedbackForm({ ...feedbackForm, type: event.target.value })}
          >
            <option>Suggestion</option>
            <option>Complaint</option>
            <option>Appreciation</option>
          </select>
          <textarea
            rows={3}
            placeholder="Share feedback for public officials"
            value={feedbackForm.message}
            onChange={(event) =>
              setFeedbackForm({ ...feedbackForm, message: event.target.value })
            }
          />
          <button type="submit">Submit Feedback</button>
        </form>
      </section>

      <section className="panel">
        <h3>Your Reported Issues</h3>
        <div className="inline-controls stack-mobile">
          <input
            placeholder="Search by title, description, or location"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Escalated</option>
            <option>Under Review</option>
          </select>
        </div>
        <div className="list-grid">
          {visibleIssues.slice(0, 8).map((issue) => (
            <article key={issue.id} className="list-card">
              <h4>{issue.title}</h4>
              <p>
                {issue.category} | {issue.location || "N/A"} | {issue.priority}
              </p>
              <p>Status: {issue.status}</p>
              <p>{issue.response || "Awaiting official response."}</p>
            </article>
          ))}
        </div>
        {visibleIssues.length === 0 && <p className="subtitle">No issues match this filter.</p>}
      </section>

      <section className="panel">
        <h3>Latest Politician Updates</h3>
        <div className="list-grid">
          {updates.slice(0, 4).map((update) => (
            <article key={update.id} className="list-card">
              <h4>{update.title}</h4>
              <p>{update.message}</p>
              <p>
                {update.author} | {update.audience}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Feedback Status</h3>
        <div className="list-grid">
          {feedback.slice(0, 4).map((item) => (
            <article key={item.id} className="list-card">
              <h4>{item.type}</h4>
              <p>{item.message}</p>
              <p>Status: {item.status}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
