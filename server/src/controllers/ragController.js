// server/src/controllers/ragController.js

import pythonService from "../services/pythonService.js";

// Ask question to RAG system
export const askQuestion = async (req, res) => {
  try {
    const { question, botId } = req.body;

    if (!question) {
      return res.status(400).json({
        ok: false,
        error: "missing_question",
        message: "Question is required",
      });
    }

    // Use centralized Python service
    const result = await pythonService.askQuestion(
      question,
      botId,
      req.user.userId,
      req.user.role,
      req.user.tenantId
    );

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[rag:ask] error:", error);

    // Use error information from service
    const statusCode = error.status >= 400 ? error.status : 503;

    res.status(statusCode).json({
      ok: false,
      error: "rag_service_error",
      message: error.message || "AI service is currently unavailable",
    });
  }
};

// Admin endpoint with detailed sources
export const adminAskQuestion = async (req, res) => {
  try {
    const { question, botId } = req.body;

    if (!question) {
      return res.status(400).json({
        ok: false,
        error: "missing_question",
        message: "Question is required",
      });
    }

    // Use centralized Python service
    const result = await pythonService.adminAskQuestion(
      question,
      botId,
      req.user.userId,
      req.user.role,
      req.user.tenantId
    );

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[rag:admin-ask] error:", error);

    const statusCode = error.status >= 400 ? error.status : 503;

    res.status(statusCode).json({
      ok: false,
      error: "rag_service_error",
      message: error.message || "AI service is currently unavailable",
    });
  }
};

// Ingest files for a bot
export const ingestFiles = async (req, res) => {
  try {
    const { botId, paths } = req.body;

    if (!botId || !paths || !Array.isArray(paths)) {
      return res.status(400).json({
        ok: false,
        error: "missing_parameters",
        message: "botId and paths array are required",
      });
    }

    // Use centralized Python service
    const result = await pythonService.ingestFiles(
      botId,
      paths,
      req.user.userId,
      req.user.tenantId,
      req.user.role
    );

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[rag:ingest] error:", error);

    const statusCode = error.status >= 400 ? error.status : 503;

    res.status(statusCode).json({
      ok: false,
      error: "ingest_service_error",
      message:
        error.message || "File ingestion service is currently unavailable",
    });
  }
};

// Health check endpoint
export const healthCheck = async (req, res) => {
  try {
    const status = await pythonService.healthCheck();

    res.json({
      ok: true,
      service: "python_rag",
      ...status,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: "python_rag",
      status: "unavailable",
      error: error.message,
    });
  }
};
