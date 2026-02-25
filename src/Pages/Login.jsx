import { useState } from "react";

const allowedGmailPattern =
  /^(?=.{6,30}@gmail\.com$)[a-z][a-z0-9]*(?:\.[a-z0-9]+)*@gmail\.com$/i;
const strongPasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Login({ onLogin }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "citizen",
  });
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();

    if (attempts >= 5) {
      setError("Too many failed attempts. Access temporarily blocked.");
      return;
    }

    if (!allowedGmailPattern.test(email)) {
      setError(
        "Use a valid Gmail with at least 6 characters before @ (example: haribabu1@gmail.com).",
      );
      setAttempts((prev) => prev + 1);
      return;
    }

    if (!strongPasswordPattern.test(form.password)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      );
      setAttempts((prev) => prev + 1);
      return;
    }

    setError("");
    setAttempts(0);
    onLogin({ email, role: form.role });
  };

  return (
    <div className="container auth">
      <h1>CivicConnect</h1>
      <p className="subtitle">
        A civic engagement platform for transparent communication between citizens and
        elected representatives.
      </p>
      <form className="panel auth-form" onSubmit={handleSubmit}>
        <h3>Sign In</h3>
        <input
          type="email"
          placeholder="yourname@gmail.com"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
        >
          <option value="citizen">Citizen</option>
          <option value="politician">Politician</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit">Login</button>
        <p className="auth-help">
          Any valid Gmail is allowed, but very short nickname-style IDs are blocked.
        </p>
      </form>
    </div>
  );
}
