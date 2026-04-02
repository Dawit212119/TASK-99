import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { readRateLimiter, writeRateLimiter } from "../middleware/rateLimiter";
import {
  handleListNotifications,
  handleOpenNotification,
  handleGetSubscriptions,
  handleUpdateSubscriptions,
} from "../controllers/notifications.controller";

const router = Router();

// ── User-facing notification endpoints ────────────────────────────────────────
router.use(authenticate, tenantScope);

// Subscription routes MUST be registered before /:notificationId/open
// to avoid Express treating "subscriptions" as a notificationId param
router.get("/notifications/subscriptions", readRateLimiter, handleGetSubscriptions);
router.put("/notifications/subscriptions", writeRateLimiter, handleUpdateSubscriptions);

router.get("/notifications", readRateLimiter, handleListNotifications);
router.post("/notifications/:notificationId/open", writeRateLimiter, handleOpenNotification);

export default router;
