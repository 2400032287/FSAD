import { readData, writeData } from "../lib/store.js";

const FLAGGED_WORDS = ["hate", "abuse", "threat"];
const ALLOWED_ROLES = ["admin", "citizen", "politician", "moderator"];

const today = () => new Date().toISOString().slice(0, 10);

const nextId = (items) =>
  items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;

const formatNameFromEmail = (email) =>
  email
    .split("@")[0]
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function isAllowedRole(role) {
  return ALLOWED_ROLES.includes(role);
}

export function getMetrics(data) {
  return {
    totalIssues: data.issues.length,
    openIssues: data.issues.filter((item) => item.status === "Open").length,
    resolvedIssues: data.issues.filter((item) => item.status === "Resolved").length,
    pendingFeedback: data.feedback.filter((item) => item.status !== "Approved").length,
    totalUpdates: data.updates.length,
    moderationActions: data.moderationLog.length,
  };
}

export async function getBootstrapData() {
  const data = await readData();
  return { ...data, metrics: getMetrics(data) };
}

export async function loginUser({ role, email }) {
  const data = await readData();
  const existingUser = data.users.find((user) => user.email === email);

  if (existingUser && existingUser.status === "suspended") {
    const error = new Error("This account is suspended.");
    error.status = 403;
    throw error;
  }

  if (!existingUser) {
    data.users.unshift({
      id: nextId(data.users),
      name: formatNameFromEmail(email),
      email,
      role,
      status: "active",
    });
  }

  data.session = {
    role,
    email,
    name: formatNameFromEmail(email),
  };

  await writeData(data);

  return {
    session: data.session,
    users: data.users,
  };
}

export async function logoutUser() {
  const data = await readData();
  data.session = null;
  await writeData(data);
}

export async function createIssue(payload) {
  const data = await readData();
  const issue = {
    id: nextId(data.issues),
    title: payload.title,
    description: payload.description,
    category: payload.category,
    location: payload.location,
    createdBy: payload.createdBy,
    priority: payload.priority,
    status: "Open",
    response: "",
    updatedAt: today(),
  };

  data.issues.unshift(issue);
  await writeData(data);
  return issue;
}

export async function respondToIssue(issueId, payload) {
  const data = await readData();
  const issue = data.issues.find((item) => item.id === issueId);

  if (!issue) {
    const error = new Error("Issue not found.");
    error.status = 404;
    throw error;
  }

  issue.response = `${payload.politician}: ${payload.response}`;
  issue.status = payload.status || issue.status;
  issue.updatedAt = today();

  await writeData(data);
  return issue;
}

export async function resolveIssue(issueId, payload) {
  const data = await readData();
  const issue = data.issues.find((item) => item.id === issueId);

  if (!issue) {
    const error = new Error("Issue not found.");
    error.status = 404;
    throw error;
  }

  issue.status = payload.decision || issue.status;
  if (payload.note) {
    issue.response = issue.response
      ? `${issue.response} | Moderator note: ${payload.note}`
      : `Moderator note: ${payload.note}`;
  }
  issue.updatedAt = today();

  data.moderationLog.unshift({
    id: nextId(data.moderationLog),
    actor: payload.moderator,
    target: `Issue #${issueId}`,
    action: payload.decision,
    note: payload.note || "",
    createdAt: today(),
  });

  await writeData(data);
  return { issue, moderationLog: data.moderationLog };
}

export async function createFeedback(payload) {
  const data = await readData();
  const lowered = payload.message.toLowerCase();
  const flagged = FLAGGED_WORDS.some((word) => lowered.includes(word));

  const feedback = {
    id: nextId(data.feedback),
    message: payload.message,
    type: payload.type,
    createdBy: payload.createdBy,
    status: flagged ? "Needs Review" : "Pending",
    flagged,
    moderatorNote: "",
    createdAt: today(),
  };

  data.feedback.unshift(feedback);
  await writeData(data);
  return feedback;
}

export async function moderateFeedback(feedbackId, payload) {
  const data = await readData();
  const feedback = data.feedback.find((item) => item.id === feedbackId);

  if (!feedback) {
    const error = new Error("Feedback not found.");
    error.status = 404;
    throw error;
  }

  feedback.flagged = payload.action !== "Approved";
  feedback.status = payload.action;
  feedback.moderatorNote = payload.moderatorNote || "";

  data.moderationLog.unshift({
    id: nextId(data.moderationLog),
    actor: payload.moderator,
    target: `Feedback #${feedbackId}`,
    action: payload.action,
    note: payload.moderatorNote || "",
    createdAt: today(),
  });

  await writeData(data);
  return { feedback, moderationLog: data.moderationLog };
}

export async function createUpdate(payload) {
  const data = await readData();
  const update = {
    id: nextId(data.updates),
    title: payload.title,
    message: payload.message,
    audience: payload.audience,
    author: payload.author,
    createdAt: today(),
  };

  data.updates.unshift(update);
  await writeData(data);
  return update;
}

export async function updateUserRole(userId, nextRole) {
  const data = await readData();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  user.role = nextRole;
  await writeData(data);
  return user;
}

export async function toggleUserStatus(userId) {
  const data = await readData();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  user.status = user.status === "active" ? "suspended" : "active";

  if (data.session?.email === user.email && user.status === "suspended") {
    data.session = null;
  }

  await writeData(data);
  return { user, session: data.session };
}
