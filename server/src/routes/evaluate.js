// server/src/routes/evaluate.js - UPDATED
import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  startEvaluation,
  evaluateChat,
  getEvaluationSession,
  endEvaluation,
} from "../controllers/evaluateController.js";

const router = express.Router();

// POST /api/evaluate/start - Start evaluation session
router.post("/start", authenticateToken, startEvaluation);

// POST /api/evaluate/chat - Send message in evaluation
router.post("/chat", authenticateToken, evaluateChat);

// GET /api/evaluate/session/:sessionId - Get evaluation session
router.get("/session/:sessionId", authenticateToken, getEvaluationSession);

// DELETE /api/evaluate/session/:sessionId - End evaluation session
router.delete("/session/:sessionId", authenticateToken, endEvaluation);

export default router;
