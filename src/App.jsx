import { useEffect, useMemo, useState } from "react";
import Login from "./Pages/Login";
import Admin from "./Pages/Admin";
import Citizen from "./Pages/Citizen";
import Moderator from "./Pages/Moderator";
import Politician from "./Pages/Politician";
import Navbar from "./Components/Navbar";

const ROLE_CONFIG = [
  {
    key: "admin",
    label: "Admin",
    description: "Oversee platform operations, roles, and data integrity.",
  },
  {
    key: "citizen",
    label: "Citizen",
    description: "Report issues, share feedback, and track representative updates.",
  },
  {
    key: "politician",
    label: "Politician",
    description: "Respond to concerns, post updates, and engage in dialogue.",
  },
  {
    key: "moderator",
    label: "Moderator",
    description: "Ensure respectful communication and resolve conflicts.",
  },
];

const API_BASE =
  import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "/api" : "http://localhost:5000/api");
const SESSION_KEY = "civicconnect_session_v1";

const formatNameFromEmail = (email) =>
  email
    .split("@")[0]
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getStoredSession = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function App() {
  const [session, setSession] = useState(getStoredSession);
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [moderationLog, setModerationLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadState = async () => {
    try {
      setError("");
      await request("/health");
      setUsers([]);
      setIssues([]);
      setFeedback([]);
      setUpdates([]);
      setModerationLog([]);
    } catch {
      setError("Live frontend is running, but the backend server is not connected.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  const addIssue = async (payload) => {
    const created = await request("/issues", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setIssues((prev) => [created.issue ?? created, ...prev]);
  };

  const addFeedback = async (payload) => {
    const created = {
      id: Date.now(),
      ...payload,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    setFeedback((prev) => [created, ...prev]);
  };

  const respondToIssue = async ({ issueId, response, status, politician }) => {
    const updated = await request(`/issues/${issueId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, response, politician }),
    });

    setIssues((prev) =>
      prev.map((item) => (item.id === issueId ? (updated.issue ?? updated) : item)),
    );
  };

  const postUpdate = async (payload) => {
    const created = {
      id: Date.now(),
      ...payload,
      createdAt: new Date().toISOString(),
    };

    setUpdates((prev) => [created, ...prev]);
  };

  const moderateFeedback = async ({ feedbackId, action, moderatorNote, moderator }) => {
    setFeedback((prev) =>
      prev.map((item) =>
        item.id === feedbackId
          ? {
              ...item,
              status: action ?? item.status,
              moderatorNote,
              moderator,
            }
          : item,
      ),
    );
  };

  const resolveIssue = async ({ issueId, decision, note, moderator }) => {
    const updated = await request(`/issues/${issueId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: decision, note, moderator }),
    });

    setIssues((prev) =>
      prev.map((item) => (item.id === issueId ? (updated.issue ?? updated) : item)),
    );
  };

  const updateUserRole = async (userId, nextRole) => {
    setUsers((prev) =>
      prev.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)),
    );
  };

  const toggleUserStatus = async (userId) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId
          ? {
              ...item,
              status: item.status === "active" ? "suspended" : "active",
            }
          : item,
      ),
    );
  };

  const metrics = useMemo(
    () => ({
      totalIssues: issues.length,
      openIssues: issues.filter((item) => item.status === "Open").length,
      resolvedIssues: issues.filter((item) => item.status === "Resolved").length,
      pendingFeedback: feedback.filter((item) => item.status !== "Approved").length,
      totalUpdates: updates.length,
      moderationActions: moderationLog.length,
    }),
    [issues, feedback, updates, moderationLog],
  );

  const renderPage = () => {
    switch (session?.role) {
      case "admin":
        return (
          <Admin
            users={users}
            metrics={metrics}
            moderationLog={moderationLog}
            updateUserRole={updateUserRole}
            toggleUserStatus={toggleUserStatus}
          />
        );
      case "citizen":
        return (
          <Citizen
            currentUser={session}
            issues={issues}
            updates={updates}
            feedback={feedback}
            addIssue={addIssue}
            addFeedback={addFeedback}
          />
        );
      case "moderator":
        return (
          <Moderator
            currentUser={session}
            issues={issues}
            feedback={feedback}
            moderationLog={moderationLog}
            moderateFeedback={moderateFeedback}
            resolveIssue={resolveIssue}
          />
        );
      case "politician":
        return (
          <Politician
            currentUser={session}
            issues={issues}
            updates={updates}
            respondToIssue={respondToIssue}
            postUpdate={postUpdate}
          />
        );
      default:
        return (
          <Login
            roles={ROLE_CONFIG}
            onLogin={({ role, email }) =>
              setSession({
                role,
                email,
                name: formatNameFromEmail(email),
              })
            }
          />
        );
    }
  };

  if (loading) {
    return <main className="app-shell">Loading platform data...</main>;
  }

  return (
    <>
      {session && (
        <Navbar
          currentRole={session.role}
          userName={session.name}
          userEmail={session.email}
          roles={ROLE_CONFIG}
          onLogout={() => setSession(null)}
        />
      )}
      <main className="app-shell">
        {error ? <p>{error}</p> : null}
        {renderPage()}
      </main>
    </>
  );
}

export default App;
