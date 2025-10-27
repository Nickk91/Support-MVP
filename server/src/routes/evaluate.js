// server/src/routes/evaluate.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import axios from "axios";

const router = express.Router();

// POST /api/evaluate/start - Start evaluation session
router.post("/start", authenticateToken, async (req, res) => {
  try {
    const { botId } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const pythonResponse = await axios.post(
      "http://localhost:8000/api/evaluate/start",
      {
        bot_id: botId,
        tenant_id: tenantId,
        user_id: userId,
      }
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error("Evaluation start error:", error);
    res.status(500).json({
      error: "Failed to start evaluation session",
      details: error.message,
    });
  }
});

// POST /api/evaluate/chat - Send message in evaluation
router.post("/chat", authenticateToken, async (req, res) => {
  try {
    const { sessionId, message, botId } = req.body;

    const pythonResponse = await axios.post(
      "http://localhost:8000/api/evaluate/chat",
      {
        session_id: sessionId,
        message: {
          message: message,
          bot_id: botId,
        },
      }
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error("Evaluation chat error:", error);
    res.status(500).json({
      error: "Failed to process evaluation message",
      details: error.message,
    });
  }
});

// GET /api/evaluate/session/:sessionId - Get evaluation session
router.get("/session/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const pythonResponse = await axios.get(
      `http://localhost:8000/api/evaluate/session/${sessionId}`
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error("Get evaluation session error:", error);
    res.status(500).json({
      error: "Failed to get evaluation session",
      details: error.message,
    });
  }
});

export default router;
