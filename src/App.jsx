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

const INITIAL_USERS = [
  { id: 1, name: "Ava Citizen", role: "citizen", status: "active" },
  { id: 2, name: "Liam Citizen", role: "citizen", status: "active" },
  { id: 3, name: "Maya Patel", role: "politician", status: "active" },
  { id: 4, name: "Rohan Das", role: "moderator", status: "active" },
  { id: 5, name: "System Admin", role: "admin", status: "active" },
];
const PRIVILEGED_USERS = [
  { email: "maya.patel@gmail.com", role: "politician", name: "Maya Patel" },
  { email: "rohan.das@gmail.com", role: "moderator", name: "Rohan Das" },
  { email: "system.admin@gmail.com", role: "admin", name: "System Admin" },
];
const STORAGE_KEY = "civicconnect_state_v1";

const today = () => new Date().toISOString().slice(0, 10);
const nextId = (items) =>
  items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
const formatNameFromEmail = (email) =>
  email
    .split("@")[0]
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const getInitialState = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.issues) ||
      !Array.isArray(parsed.feedback) ||
      !Array.isArray(parsed.updates) ||
      !Array.isArray(parsed.moderationLog)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

function App() {
  const persisted = useMemo(() => getInitialState(), []);
  const [session, setSession] = useState(persisted?.session ?? null);
  const [users, setUsers] = useState(persisted?.users ?? INITIAL_USERS);
  const [issues, setIssues] = useState(
    persisted?.issues ?? [
    {
      id: 1,
      title: "Streetlight outage on Maple Street",
      description: "Three lights have been out for 2 weeks near bus stop.",
      category: "Infrastructure",
      location: "Ward 4",
      status: "Open",
      createdBy: "Ava Citizen",
      priority: "High",
      response: "",
      updatedAt: today(),
    },
  ],
  );
  const [feedback, setFeedback] = useState(
    persisted?.feedback ?? [
    {
      id: 1,
      message: "Weekly transit updates are helpful. Please include route maps.",
      type: "Suggestion",
      createdBy: "Liam Citizen",
      status: "Pending",
      flagged: false,
      moderatorNote: "",
      createdAt: today(),
    },
  ],
  );
  const [updates, setUpdates] = useState(
    persisted?.updates ?? [
    {
      id: 1,
      title: "Budget Hearing Reminder",
      message: "Public budget hearing is scheduled for Friday at City Hall.",
      audience: "All Citizens",
      author: "Maya Patel",
      createdAt: today(),
    },
  ],
  );
  const [moderationLog, setModerationLog] = useState(
    persisted?.moderationLog ?? [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        users,
        issues,
        feedback,
        updates,
        moderationLog,
        session,
      }),
    );
  }, [users, issues, feedback, updates, moderationLog, session]);

  const addIssue = (payload) => {
    setIssues((prev) => [
      {
        id: nextId(prev),
        status: "Open",
        response: "",
        updatedAt: today(),
        ...payload,
      },
      ...prev,
    ]);
  };

  const addFeedback = (payload) => {
    const lowered = payload.message.toLowerCase();
    const flagged = ["hate", "abuse", "threat"].some((word) =>
      lowered.includes(word),
    );

    setFeedback((prev) => [
      {
        id: nextId(prev),
        status: flagged ? "Needs Review" : "Pending",
        flagged,
        moderatorNote: "",
        createdAt: today(),
        ...payload,
      },
      ...prev,
    ]);
  };

  const respondToIssue = ({ issueId, response, status, politician }) => {
    setIssues((prev) =>
      prev.map((item) =>
        item.id === issueId
          ? {
              ...item,
              response: `${politician}: ${response}`,
              status,
              updatedAt: today(),
            }
          : item,
      ),
    );
  };

  const postUpdate = (payload) => {
    setUpdates((prev) => [
      { id: nextId(prev), createdAt: today(), ...payload },
      ...prev,
    ]);
  };

  const moderateFeedback = ({ feedbackId, action, moderatorNote, moderator }) => {
    setFeedback((prev) =>
      prev.map((item) =>
        item.id === feedbackId
          ? {
              ...item,
              flagged: action !== "Approved",
              status: action,
              moderatorNote,
            }
          : item,
      ),
    );

    setModerationLog((prev) => [
      {
        id: nextId(prev),
        actor: moderator,
        target: `Feedback #${feedbackId}`,
        action,
        note: moderatorNote,
        createdAt: today(),
      },
      ...prev,
    ]);
  };

  const resolveIssue = ({ issueId, decision, note, moderator }) => {
    setIssues((prev) =>
      prev.map((item) =>
        item.id === issueId
          ? {
              ...item,
              status: decision,
              response: note
                ? item.response
                  ? `${item.response} | Moderator note: ${note}`
                  : `Moderator note: ${note}`
                : item.response,
              updatedAt: today(),
            }
          : item,
      ),
    );

    setModerationLog((prev) => [
      {
        id: nextId(prev),
        actor: moderator,
        target: `Issue #${issueId}`,
        action: decision,
        note,
        createdAt: today(),
      },
      ...prev,
    ]);
  };

  const updateUserRole = (userId, nextRole) => {
    setUsers((prev) =>
      prev.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)),
    );
  };

  const toggleUserStatus = (userId) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId
          ? { ...item, status: item.status === "active" ? "suspended" : "active" }
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
            onLogin={({ email, role: selectedRole }) => {
              const privileged = PRIVILEGED_USERS.find((user) => user.email === email);
              const role = privileged?.role ?? selectedRole ?? "citizen";
              const name = privileged?.name ?? formatNameFromEmail(email);
              setSession({
                role,
                email,
                name,
              });
            }}
          />
        );
    }
  };

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
      <main className="app-shell">{renderPage()}</main>
    </>
  );
}

export default App;
