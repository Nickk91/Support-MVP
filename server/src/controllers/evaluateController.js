// server/src/controllers/evaluateController.js - UPDATE to use real Python service
import pythonService from "../services/pythonService.js";

// Start evaluation session
export const startEvaluation = async (req, res) => {
  try {
    const { botId } = req.body;

    // FIX: Use the correct property names from auth middleware
    const userId = req.user.userId; // Changed from req.user.id
    const tenantId = req.user.tenantId; // This might also be undefined

    console.log("🔍 Starting evaluation session with Python backend:", {
      botId,
      userId,
      tenantId,
      fullUser: req.user, // Log the full user object for debugging
    });

    // If tenantId is undefined, we might need to handle it
    const effectiveTenantId = tenantId || "default_tenant";

    // Use real Python service
    const result = await pythonService.startEvaluation(
      botId,
      userId,
      effectiveTenantId
    );

    console.log("✅ Evaluation session started:", result);
    res.json(result);
  } catch (error) {
    console.error("Evaluation start error:", error);

    if (error.status === 422) {
      return res.status(422).json({
        error: "Invalid request format to Python service",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to start evaluation session",
      details: error.message,
    });
  }
};

// Send message in evaluation session
export const evaluateChat = async (req, res) => {
  try {
    const { sessionId, message, botId } = req.body;

    // FIX: Use the correct property names
    const userId = req.user.userId; // Changed from req.user.id
    const tenantId = req.user.tenantId || "default_tenant";

    console.log("🔍 Sending evaluation message to Python backend:", {
      sessionId,
      message,
      botId,
    });

    // Use real Python service
    const result = await pythonService.evaluateChat(
      sessionId,
      message,
      botId,
      userId,
      tenantId
    );

    console.log("✅ Evaluation response received:", {
      responseLength: result.response?.length,
      sourcesCount: result.sources?.length,
    });
    res.json(result);
  } catch (error) {
    console.error("Evaluation chat error:", error);

    if (error.status === 422) {
      return res.status(422).json({
        error: "Invalid message format to Python service",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to process evaluation message",
      details: error.message,
    });
  }
};

// Get evaluation session
export const getEvaluationSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const result = await pythonService.getEvaluationSession(
      sessionId,
      userId,
      tenantId
    );

    res.json(result);
  } catch (error) {
    console.error("Get evaluation session error:", error);
    res.status(500).json({
      error: "Failed to get evaluation session",
      details: error.message,
    });
  }
};

// End evaluation session
export const endEvaluation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const result = await pythonService.endEvaluation(
      sessionId,
      userId,
      tenantId
    );

    res.json(result);
  } catch (error) {
    console.error("End evaluation session error:", error);
    res.status(500).json({
      error: "Failed to end evaluation session",
      details: error.message,
    });
  }
};
