function AnalyticsPanel({ metrics }) {
  const cards = [
    { label: "Total Issues", value: metrics.totalIssues ?? 0 },
    { label: "Open Issues", value: metrics.openIssues ?? 0 },
    { label: "Resolved Issues", value: metrics.resolvedIssues ?? 0 },
    { label: "Pending Feedback", value: metrics.pendingFeedback ?? 0 },
    { label: "Updates", value: metrics.totalUpdates ?? 0 },
    { label: "Moderation Actions", value: metrics.moderationActions ?? 0 },
  ];

  return (
    <section className="analytics-panel">
      {cards.map((card) => (
        <article key={card.label} className="analytics-card">
          <p className="analytics-label">{card.label}</p>
          <strong className="analytics-value">{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

export default AnalyticsPanel;
