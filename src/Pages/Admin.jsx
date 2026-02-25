export default function Admin({
  users,
  metrics,
  moderationLog,
  updateUserRole,
  toggleUserStatus,
}) {
  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      <p className="subtitle">
        Oversee role assignments, user access, and system activity health.
      </p>

      <section className="panel">
        <h3>Platform Metrics</h3>
        <div className="stats-grid">
          <article>
            <strong>{metrics.totalIssues}</strong>
            <span>Total Issues</span>
          </article>
          <article>
            <strong>{metrics.openIssues}</strong>
            <span>Open Issues</span>
          </article>
          <article>
            <strong>{metrics.resolvedIssues}</strong>
            <span>Resolved Issues</span>
          </article>
          <article>
            <strong>{metrics.pendingFeedback}</strong>
            <span>Feedback Awaiting Action</span>
          </article>
          <article>
            <strong>{metrics.totalUpdates}</strong>
            <span>Public Updates</span>
          </article>
          <article>
            <strong>{metrics.moderationActions}</strong>
            <span>Moderation Actions</span>
          </article>
        </div>
      </section>

      <section className="panel">
        <h3>User & Role Management</h3>
        <div className="list-grid">
          {users.map((user) => (
            <article key={user.id} className="list-card">
              <h4>{user.name}</h4>
              <p>Role: {user.role}</p>
              <p>Status: {user.status}</p>
              <div className="inline-controls">
                <select
                  value={user.role}
                  onChange={(event) => updateUserRole(user.id, event.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="citizen">Citizen</option>
                  <option value="politician">Politician</option>
                  <option value="moderator">Moderator</option>
                </select>
                <button type="button" onClick={() => toggleUserStatus(user.id)}>
                  {user.status === "active" ? "Suspend" : "Activate"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Data Integrity Timeline</h3>
        {moderationLog.length === 0 ? (
          <p>No integrity events recorded yet.</p>
        ) : (
          <div className="list-grid">
            {moderationLog.slice(0, 6).map((item) => (
              <article key={item.id} className="list-card">
                <h4>{item.action}</h4>
                <p>
                  {item.target} by {item.actor}
                </p>
                <p>{item.note || "No additional note provided."}</p>
                <p>Date: {item.createdAt}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
