// TEMPORARY MOCK - Add this to evaluateController.js for testing
const mockEvaluationSessions = new Map();

// Mock start evaluation (temporary)
export const startEvaluation = async (req, res) => {
  try {
    const { botId } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    console.log("🔍 Starting MOCK evaluation session:", {
      botId,
      userId,
      tenantId,
    });

    // Generate session ID
    const sessionId = `eval_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create mock session
    mockEvaluationSessions.set(sessionId, {
      session_id: sessionId,
      bot_id: botId,
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      messages: [],
    });

    // Return mock response
    res.json({
      session_id: sessionId,
      message: "Mock evaluation session started",
      status: "active",
    });
  } catch (error) {
    console.error("Mock evaluation start error:", error);
    res.status(500).json({
      error: "Failed to start evaluation session",
      details: error.message,
    });
  }
};

// Mock evaluate chat (temporary)
export const evaluateChat = async (req, res) => {
  try {
    const { sessionId, message, botId } = req.body;

    console.log("🔍 MOCK evaluation chat:", { sessionId, message, botId });

    // Get session
    const session = mockEvaluationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: "Session not found",
        details: `Evaluation session ${sessionId} does not exist`,
      });
    }

    // Add user message
    session.messages.push({
      id: `msg_${Date.now()}`,
      type: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Generate mock bot response
    const botResponse = {
      id: `msg_${Date.now() + 1}`,
      type: "bot",
      content: `This is a mock response to: "${message}". The actual RAG system would process this.`,
      sources: ["mock_document.pdf", "sample_policy.txt"],
      timestamp: new Date().toISOString(),
    };

    session.messages.push(botResponse);

    res.json({
      response: botResponse.content,
      sources: botResponse.sources,
      session_id: sessionId,
    });
  } catch (error) {
    console.error("Mock evaluation chat error:", error);
    res.status(500).json({
      error: "Failed to process evaluation message",
      details: error.message,
    });
  }
};

// Mock get session (temporary)
export const getEvaluationSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = mockEvaluationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: "Session not found",
        details: `Evaluation session ${sessionId} does not exist`,
      });
    }

    res.json(session);
  } catch (error) {
    console.error("Mock get evaluation session error:", error);
    res.status(500).json({
      error: "Failed to get evaluation session",
      details: error.message,
    });
  }
};

// Mock end session (temporary)
export const endEvaluation = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const deleted = mockEvaluationSessions.delete(sessionId);

    res.json({
      message: deleted ? "Evaluation session ended" : "Session not found",
      session_id: sessionId,
    });
  } catch (error) {
    console.error("Mock end evaluation session error:", error);
    res.status(500).json({
      error: "Failed to end evaluation session",
      details: error.message,
    });
  }
};
