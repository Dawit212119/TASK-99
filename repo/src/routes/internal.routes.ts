import { Router } from "express";
import { internalAuth } from "../middleware/internalAuth";
import {
  handleDispatchDue,
  handleRetryFailed,
} from "../controllers/notifications.controller";

const router = Router();

// Internal endpoints: protected by static API key, no user session.
// Mounted before any router that applies `authenticate` middleware globally.
router.post(
  "/internal/notifications/dispatch-due",
  internalAuth,
  handleDispatchDue
);
router.post(
  "/internal/notifications/retry-failed",
  internalAuth,
  handleRetryFailed
);

export default router;
