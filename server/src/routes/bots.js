// server/src/routes/bots.js - UPDATE to add debug route
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { Bot } from "../models/Bot.js";
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
router.get("/test/cleanup", (req, res) => {
  res.json({
    ok: true,
    message: "Cleanup route is working",
    botId: req.query.botId,
  });
});

// Add to bots.js routes for testing
// Add this route WITH authentication
router.get("/:id/files/debug", authenticateToken, async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ ok: false, error: "Bot not found" });
    }

    // Verify user owns the bot
    if (bot.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    }

    res.json({
      ok: true,
      botId: req.params.id,
      botName: bot.botName,
      files: bot.files,
      filesCount: bot.files.length,
      fileDetails: bot.files.map((f) => ({
        filename: f.filename,
        storedAs: f.storedAs,
        s3Key: f.s3Key,
        allProps: Object.keys(f),
      })),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
