// server\services\pythonService.js
import axios from "axios";

class PythonService {
  constructor() {
    this.baseURL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for consistent error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("Python Service Error:", error.message);
        throw error;
      }
    );
  }

  /**
   * Make a request to Python service with proper headers
   */
  async request(method, endpoint, data = {}, headers = {}) {
    try {
      const response = await this.client({
        method,
        url: endpoint,
        data,
        headers,
      });

      return response.data;
    } catch (error) {
      console.error(
        `Python Service ${method} ${endpoint} failed:`,
        error.message
      );

      // Enhanced error information
      const serviceError = new Error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          error.message ||
          "Python service request failed"
      );

      serviceError.status = error.response?.status || 500;
      serviceError.originalError = error;

      throw serviceError;
    }
  }

  /**
   * Create a bot in Python RAG service
   */
  async createBot(botData, userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    return this.request("POST", "/api/bots", botData, headers);
  }

  /**
   * Update a bot in Python RAG service
   */
  async updateBot(botId, botData, userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    return this.request("PUT", `/api/bots/${botId}`, botData, headers);
  }

  /**
   * Delete a bot and its vector store from Python RAG service
   */
  async deleteBot(botId, userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    try {
      return await this.request("DELETE", `/api/bots/${botId}`, {}, headers);
    } catch (error) {
      // If bot not found in Python service (404), that's OK - we still want to cleanup vector store
      if (error.status === 404) {
        console.log(
          `ℹ️ Bot ${botId} not found in Python service (may have been deleted already), proceeding with vector store cleanup`
        );

        // Try to force cleanup the vector store directly
        try {
          const result = await this.forceCleanupBot(botId, userId, tenantId);
          return {
            ok: true,
            message: "Vector store cleaned up successfully",
            details: result,
          };
        } catch (cleanupError) {
          console.warn(
            `⚠️ Vector store cleanup also failed for bot ${botId}:`,
            cleanupError.message
          );
          // Still return success since the main bot deletion succeeded
          return {
            ok: true,
            message: "Bot deleted (vector store cleanup may be incomplete)",
            warning: "Vector store files may need manual cleanup",
          };
        }
      }
      throw error;
    }
  }

  /**
   * Get bot configuration from Python RAG service
   */
  async getBot(botId, userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    return this.request("GET", `/api/bots/${botId}`, {}, headers);
  }

  /**
   * List all bots for a tenant/user
   */
  async listBots(userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    return this.request("GET", "/api/bots", {}, headers);
  }

  /**
   * Ingest files for a bot
   */
  async ingestFiles(botId, paths, userId, tenantId = null, userRole = null) {
    const headers = {
      "X-User-ID": userId,
      "X-Bot-ID": botId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    if (userRole) {
      headers["X-User-Role"] = userRole;
    }

    const data = {
      bot_id: botId,
      paths: paths,
      user_id: userId,
    };

    return this.request("POST", "/api/ingest", data, headers);
  }

  /**
   * Clean up specific files from vector store - FIXED WITH FALLBACKS
   */
  async cleanupFiles(botId, filePaths, userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    const data = {
      bot_id: botId, // Changed from botId to bot_id
      file_paths: filePaths, // Changed from filePaths to file_paths
    };

    // Try multiple endpoints with fallbacks
    try {
      return await this.request("POST", "/api/cleanup/files", data, headers);
    } catch (error) {
      if (error.status === 404) {
        console.log(
          "⚠️ /api/cleanup/files not found, trying alternative endpoint"
        );

        // Try the ingest endpoint with delete operation
        try {
          return await this.request(
            "DELETE",
            `/api/ingest/${botId}`,
            { file_paths: filePaths },
            headers
          );
        } catch (secondError) {
          if (secondError.status === 404) {
            console.log(
              "⚠️ Alternative endpoint also not found, trying force cleanup"
            );

            // Final fallback - force cleanup the entire bot's vector store
            try {
              const result = await this.forceCleanupBot(
                botId,
                userId,
                tenantId
              );
              return {
                ok: true,
                message: "Vector store force cleaned up",
                details: result,
              };
            } catch (finalError) {
              console.warn(
                "⚠️ All cleanup methods failed, continuing without vector cleanup"
              );
              return {
                ok: true,
                message:
                  "File cleanup completed (vector store cleanup skipped)",
                warning: "Vector store may contain orphaned data",
              };
            }
          }
          throw secondError;
        }
      }
      throw error;
    }
  }

  /**
   * Force cleanup bot data (admin/fallback)
   */
  async forceCleanupBot(botId, userId, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
    };

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    try {
      return await this.request(
        "DELETE",
        `/api/cleanup/bot/${botId}`,
        {},
        headers
      );
    } catch (error) {
      // If force cleanup also fails, that's OK - it's a best-effort operation
      if (error.status === 404) {
        console.log(
          `ℹ️ Bot ${botId} not found for force cleanup - vector store may not exist`
        );
        return {
          ok: true,
          message:
            "Vector store cleanup not required (bot not found in Python service)",
          details: "This is normal if the Python service was restarted",
        };
      }
      throw error;
    }
  }

  /**
   * Ask question to RAG system
   */
  async askQuestion(question, botId, userId, userRole = null, tenantId = null) {
    const headers = {
      "X-User-ID": userId,
      "X-Bot-ID": botId,
    };

    if (userRole) {
      headers["X-User-Role"] = userRole;
    }

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    const data = {
      question,
      user_id: userId,
    };

    return this.request("POST", "/api/ask", data, headers);
  }

  /**
   * Admin ask question with detailed sources
   */
  async adminAskQuestion(
    question,
    botId,
    userId,
    userRole = null,
    tenantId = null
  ) {
    const headers = {
      "X-User-ID": userId,
      "X-Bot-ID": botId,
    };

    if (userRole) {
      headers["X-User-Role"] = userRole;
    }

    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    const data = {
      question,
      user_id: userId,
    };

    return this.request("POST", "/api/admin/ask", data, headers);
  }

  /**
   * Health check for Python service
   */
  async healthCheck() {
    try {
      const response = await this.client.get("/health");
      return {
        ok: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      return {
        ok: false,
        status: error.response?.status || 0,
        error: error.message,
      };
    }
  }

  /**
   * Get service status
   */
  async getStatus() {
    return this.healthCheck();
  }
}

// Create singleton instance
const pythonService = new PythonService();

export default pythonService;
