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
  cleanupUploads, // ADD THIS IMPORT
} from "../controllers/botController.js";

const router = Router();

// All bot routes require authentication
router.use(authenticateToken);

router.post("/", createBot);
router.get("/", getBots);
router.get("/:id", getBot);
router.put("/:id", updateBot);
router.delete("/:id", deleteBot);
router.get("/debug/uploads", debugUploads); // ADD THIS LINE
router.delete("/cleanup/uploads", cleanupUploads);

export default router;
