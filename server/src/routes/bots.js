// server/src/routes/bots.js - UPDATE to add debug route
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createBot,
  getBots,
  getBot,
  updateBot,
  deleteBot,
  debugUploads,
  cleanupUploads,
  cleanupOrphanedVectorStores,
} from "../controllers/botController.js";

const router = Router();

// ADD TEMPORARY DEBUG MIDDLEWARE
router.use((req, res, next) => {
  console.log("🔍 BOT ROUTES DEBUG - Incoming request:", {
    path: req.path,
    method: req.method,
    user: req.user, // This will show the user object after auth middleware
    params: req.params,
    body: req.body,
  });
  next();
});

// All bot routes require authentication
router.use(authenticateToken);

router.post("/", createBot);
router.get("/", getBots);
router.get("/:id", getBot);
router.put("/:id", updateBot);
router.delete("/:id", deleteBot);
router.get("/debug/uploads", debugUploads);
router.delete("/cleanup/uploads", cleanupUploads);
router.delete("/maintenance/cleanup-orphaned", cleanupOrphanedVectorStores);

export default router;
