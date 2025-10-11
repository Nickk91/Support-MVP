// server/src/routes/rag.js
import { Router } from "express";
import { authenticateToken, requireClientAdmin } from "../middleware/auth.js";
import {
  askQuestion,
  adminAskQuestion,
  ingestFiles,
} from "../controllers/ragController.js";

const router = Router();

// Regular user question
router.post("/ask", authenticateToken, askQuestion);

// Admin question with detailed sources
router.post(
  "/admin/ask",
  authenticateToken,
  requireClientAdmin,
  adminAskQuestion
);

router.post("/ingest", authenticateToken, requireClientAdmin, ingestFiles);

export default router;
