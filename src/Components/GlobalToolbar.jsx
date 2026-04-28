function GlobalToolbar({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  setSelectedStatus,
  selectedPriority,
  setSelectedPriority,
  onRefresh,
  isRefreshing,
}) {
  return (
    <section className="toolbar-shell">
      <div className="toolbar-group toolbar-group-grow">
        <label className="toolbar-label" htmlFor="global-search">
          Search
        </label>
        <input
          id="global-search"
          className="toolbar-input"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search issues, feedback, updates, or people"
        />
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label" htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          className="toolbar-input"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="needs review">Needs Review</option>
          <option value="suspended">Suspended</option>
          <option value="active">Active</option>
        </select>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label" htmlFor="priority-filter">
          Priority
        </label>
        <select
          id="priority-filter"
          className="toolbar-input"
          value={selectedPriority}
          onChange={(event) => setSelectedPriority(event.target.value)}
        >
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <button className="toolbar-button" type="button" onClick={onRefresh} disabled={isRefreshing}>
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </section>
  );
}

export default GlobalToolbar;
