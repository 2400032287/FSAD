export default function Navbar({ currentRole, userName, userEmail, roles, onLogout }) {
  const roleName = roles.find((item) => item.key === currentRole)?.label ?? "User";

  return (
    <nav className="nav">
      <h2>CivicConnect</h2>
      <div className="nav-controls">
        <span>
          {userName} ({roleName})
        </span>
        <span>{userEmail}</span>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
