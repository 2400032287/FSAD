import { Router } from "express";
import {
  createFeedbackRecord,
  createIssueRecord,
  createUpdateRecord,
  getAppMetrics,
  getBootstrap,
  login,
  logout,
  moderateFeedbackRecord,
  resolveIssueRecord,
  respondIssueRecord,
  toggleUserStatusRecord,
  updateUserRoleRecord,
} from "../controllers/appController.js";

export const apiRouter = Router();

apiRouter.get("/bootstrap", getBootstrap);
apiRouter.post("/login", login);
apiRouter.post("/logout", logout);
apiRouter.post("/issues", createIssueRecord);
apiRouter.patch("/issues/:id/respond", respondIssueRecord);
apiRouter.patch("/issues/:id/resolve", resolveIssueRecord);
apiRouter.post("/feedback", createFeedbackRecord);
apiRouter.patch("/feedback/:id/moderate", moderateFeedbackRecord);
apiRouter.post("/updates", createUpdateRecord);
apiRouter.patch("/users/:id/role", updateUserRoleRecord);
apiRouter.patch("/users/:id/status", toggleUserStatusRecord);
apiRouter.get("/metrics", getAppMetrics);
