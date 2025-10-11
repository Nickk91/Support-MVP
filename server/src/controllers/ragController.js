// server/src/controllers/ragController.js

const PYTHON_RAG_URL = process.env.PYTHON_RAG_URL || "http://localhost:8000";

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

    // Forward to Python RAG with user context
    const pythonResponse = await fetch(`${PYTHON_RAG_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": req.user.userId,
        "X-Tenant-ID": req.user.tenantId,
        "X-User-Role": req.user.role,
        "X-Bot-ID": botId || "",
      },
      body: JSON.stringify({
        question,
        user_id: req.user.userId,
        tenant_id: req.user.tenantId,
      }),
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python RAG service error: ${pythonResponse.status}`);
    }

    const result = await pythonResponse.json();
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[rag:ask] error:", error);
    res.status(503).json({
      ok: false,
      error: "rag_service_unavailable",
      message: "AI service is currently unavailable",
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

    // Forward to Python admin endpoint
    const pythonResponse = await fetch(`${PYTHON_RAG_URL}/api/admin/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": req.user.userId,
        "X-Tenant-ID": req.user.tenantId,
        "X-User-Role": req.user.role,
        "X-Bot-ID": botId || "",
      },
      body: JSON.stringify({
        question,
        user_id: req.user.userId,
        tenant_id: req.user.tenantId,
      }),
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python RAG service error: ${pythonResponse.status}`);
    }

    const result = await pythonResponse.json();
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[rag:admin-ask] error:", error);
    res.status(503).json({
      ok: false,
      error: "rag_service_unavailable",
      message: "AI service is currently unavailable",
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

    // Forward to Python ingest endpoint
    const pythonResponse = await fetch(`${PYTHON_RAG_URL}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": req.user.userId,
        "X-Tenant-ID": req.user.tenantId,
        "X-User-Role": req.user.role,
        "X-Bot-ID": botId,
      },
      body: JSON.stringify({
        bot_id: botId,
        paths: paths,
        user_id: req.user.userId,
      }),
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python ingest service error: ${pythonResponse.status}`);
    }

    const result = await pythonResponse.json();
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[rag:ingest] error:", error);
    res.status(503).json({
      ok: false,
      error: "ingest_service_unavailable",
      message: "File ingestion service is currently unavailable",
    });
  }
};
