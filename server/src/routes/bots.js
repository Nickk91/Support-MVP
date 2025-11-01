// server/src/routes/bots.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createBot,
  getBots,
  getBot,
  updateBot,
  deleteBot,
  cleanupLegacyBots, // 🆕
  cleanupUploads,
  debugUploads,
  cleanupOrphanedVectorStores,
} from "../controllers/botController.js";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// 🎯 MAIN BOT CRUD
router.post("/", createBot);
router.get("/", getBots);
router.get("/:id", getBot);
router.put("/:id", updateBot);
router.delete("/:id", deleteBot);

// 🎯 ONE-TIME MIGRATION ROUTE
router.delete("/maintenance/cleanup-legacy", cleanupLegacyBots);

// EXISTING UTILITY ROUTES
router.get("/debug/uploads", debugUploads);
router.delete("/cleanup/uploads", cleanupUploads);
router.delete("/maintenance/cleanup-orphaned", cleanupOrphanedVectorStores);

export default router;
