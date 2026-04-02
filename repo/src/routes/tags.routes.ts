import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { readRateLimiter, writeRateLimiter } from "../middleware/rateLimiter";
import {
  handleListTags,
  handleCreateTag,
  handleUpdateTag,
  handleDeleteTag,
} from "../controllers/tags.controller";

const router = Router();
router.use(authenticate, tenantScope);

const modOrAdmin = requireRole("MODERATOR", "ADMINISTRATOR");

router.get("/tags", readRateLimiter, handleListTags);
router.post("/tags", writeRateLimiter, modOrAdmin, handleCreateTag);
router.patch("/tags/:tagId", writeRateLimiter, modOrAdmin, handleUpdateTag);
router.delete("/tags/:tagId", writeRateLimiter, modOrAdmin, handleDeleteTag);

export default router;
