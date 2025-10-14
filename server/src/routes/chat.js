// server/src/routes/chat.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js"; // FIXED: Use named import
import axios from "axios";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const router = express.Router();

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// POST /api/chat/send - Send message to RAG service
router.post("/send", authenticateToken, async (req, res) => {
  // FIXED: Use directly
  try {
    const { message, botId, tenantId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!message || !botId || !tenantId) {
      return res.status(400).json({
        error: "Missing required fields: message, botId, tenantId",
      });
    }

    // Verify user has access to this bot and tenant
    const botsPath = join(__dirname, "../../data/bots/bots.json");
    const botsData = JSON.parse(readFileSync(botsPath, "utf8"));

    const bot = botsData.find(
      (b) =>
        b.id === botId &&
        b.tenant_id === tenantId &&
        (b.created_by === userId || req.user.role === "admin")
    );

    if (!bot) {
      return res.status(403).json({
        error: "Access denied to this bot",
      });
    }

    // Send to Python RAG service
    const pythonResponse = await axios.post(
      "http://localhost:8000/api/chat",
      {
        message,
        bot_id: botId,
        tenant_id: tenantId,
        user_id: userId,
      },
      {
        timeout: 30000, // 30 second timeout
      }
    );

    // Return the RAG response
    res.json({
      response: pythonResponse.data.response,
      sources: pythonResponse.data.sources || [],
      bot_id: botId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat send error:", error);

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "AI service is temporarily unavailable",
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Bot not found in AI service",
      });
    }

    res.status(500).json({
      error: "Failed to process message",
      details: error.message,
    });
  }
});

// GET /api/chat/history - Get chat history
router.get("/history", authenticateToken, async (req, res) => {
  // FIXED: Use directly
  try {
    const { botId, tenantId, limit = 50 } = req.query;
    const userId = req.user.id;

    if (!botId || !tenantId) {
      return res.status(400).json({
        error: "Missing required parameters: botId, tenantId",
      });
    }

    // Get history from Python service
    const pythonResponse = await axios.get(
      "http://localhost:8000/api/chat/history",
      {
        params: {
          bot_id: botId,
          tenant_id: tenantId,
          user_id: userId,
          limit: parseInt(limit),
        },
      }
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error("Chat history error:", error);

    // If Python service is down, return empty history
    if (error.code === "ECONNREFUSED") {
      return res.json({ messages: [] });
    }

    res.status(500).json({
      error: "Failed to retrieve chat history",
      details: error.message,
    });
  }
});

export default router;
