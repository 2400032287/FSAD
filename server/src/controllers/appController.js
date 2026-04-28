import {
  createFeedback,
  createIssue,
  createUpdate,
  getBootstrapData,
  getMetrics,
  isAllowedRole,
  loginUser,
  logoutUser,
  moderateFeedback,
  resolveIssue,
  respondToIssue,
  toggleUserStatus,
  updateUserRole,
} from "../models/appModel.js";
import { readData } from "../lib/store.js";

function fail(res, error, fallbackMessage) {
  res.status(error.status || 500).json({
    success: false,
    message: error.message || fallbackMessage,
  });
}

export async function getBootstrap(req, res) {
  try {
    const data = await getBootstrapData();
    res.json({ success: true, ...data });
  } catch (error) {
    fail(res, error, "Failed to load application data.");
  }
}

export async function login(req, res) {
  try {
    const { role, email } = req.body;

    if (!role || !email) {
      return res.status(400).json({
        success: false,
        message: "Role and email are required.",
      });
    }

    if (!isAllowedRole(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected.",
      });
    }

    const data = await loginUser({ role, email });
    res.json({ success: true, ...data });
  } catch (error) {
    fail(res, error, "Login failed.");
  }
}

export async function logout(req, res) {
  try {
    await logoutUser();
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    fail(res, error, "Logout failed.");
  }
}

export async function createIssueRecord(req, res) {
  try {
    const { title, description, category, location, createdBy, priority } = req.body;

    if (!title || !description || !category || !location || !createdBy || !priority) {
      return res.status(400).json({
        success: false,
        message: "Missing issue details.",
      });
    }

    const issue = await createIssue(req.body);
    res.status(201).json({ success: true, issue });
  } catch (error) {
    fail(res, error, "Failed to add issue.");
  }
}

export async function respondIssueRecord(req, res) {
  try {
    const issue = await respondToIssue(Number(req.params.id), req.body);
    res.json({ success: true, issue });
  } catch (error) {
    fail(res, error, "Failed to respond to issue.");
  }
}

export async function resolveIssueRecord(req, res) {
  try {
    const result = await resolveIssue(Number(req.params.id), req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    fail(res, error, "Failed to moderate issue.");
  }
}

export async function createFeedbackRecord(req, res) {
  try {
    const { message, type, createdBy } = req.body;

    if (!message || !type || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "Missing feedback details.",
      });
    }

    const feedback = await createFeedback(req.body);
    res.status(201).json({ success: true, feedback });
  } catch (error) {
    fail(res, error, "Failed to add feedback.");
  }
}

export async function moderateFeedbackRecord(req, res) {
  try {
    const result = await moderateFeedback(Number(req.params.id), req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    fail(res, error, "Failed to moderate feedback.");
  }
}

export async function createUpdateRecord(req, res) {
  try {
    const { title, message, audience, author } = req.body;

    if (!title || !message || !audience || !author) {
      return res.status(400).json({
        success: false,
        message: "Missing update details.",
      });
    }

    const update = await createUpdate(req.body);
    res.status(201).json({ success: true, update });
  } catch (error) {
    fail(res, error, "Failed to post update.");
  }
}

export async function updateUserRoleRecord(req, res) {
  try {
    const { nextRole } = req.body;

    if (!isAllowedRole(nextRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected.",
      });
    }

    const user = await updateUserRole(Number(req.params.id), nextRole);
    res.json({ success: true, user });
  } catch (error) {
    fail(res, error, "Failed to update user role.");
  }
}

export async function toggleUserStatusRecord(req, res) {
  try {
    const result = await toggleUserStatus(Number(req.params.id));
    res.json({ success: true, ...result });
  } catch (error) {
    fail(res, error, "Failed to update user status.");
  }
}

export async function getAppMetrics(req, res) {
  try {
    const data = await readData();
    res.json({ success: true, metrics: getMetrics(data) });
  } catch (error) {
    fail(res, error, "Failed to load metrics.");
  }
}
