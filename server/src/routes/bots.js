// server/src/routes/bots.js - NO CHANGES NEEDED
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createBot,
  getBots,
  getBot,
  updateBot,
  deleteBot,
} from "../controllers/botController.js";

const router = Router();

// All bot routes require authentication
router.use(authenticateToken);

router.post("/", createBot);
router.get("/", getBots);
router.get("/:id", getBot);
router.put("/:id", updateBot);
router.delete("/:id", deleteBot);

export default router;
