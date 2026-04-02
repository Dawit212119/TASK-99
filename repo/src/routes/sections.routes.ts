import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { readRateLimiter, writeRateLimiter } from "../middleware/rateLimiter";
import {
  handleListSections,
  handleCreateSection,
  handleUpdateSection,
  handleListSubsections,
  handleCreateSubsection,
} from "../controllers/sections.controller";

const router = Router();
router.use(authenticate, tenantScope);

const modOrAdmin = requireRole("MODERATOR", "ADMINISTRATOR");

router.get("/sections", readRateLimiter, handleListSections);
router.post("/sections", writeRateLimiter, modOrAdmin, handleCreateSection);
router.patch("/sections/:sectionId", writeRateLimiter, modOrAdmin, handleUpdateSection);

router.get("/sections/:sectionId/subsections", readRateLimiter, handleListSubsections);
router.post("/sections/:sectionId/subsections", writeRateLimiter, modOrAdmin, handleCreateSubsection);

export default router;
