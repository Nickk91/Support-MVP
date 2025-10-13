// server/src/services/pythonService.js
import axios from "axios";

class PythonRAGService {
  constructor() {
    this.baseURL = process.env.PYTHON_RAG_URL || "http://localhost:8000";
    this.timeout = 30000; // 30 seconds
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: this.timeout,
      });
      return { ok: true, data: response.data };
    } catch (error) {
      console.error(
        "❌ Python RAG service health check failed:",
        error.message
      );
      return { ok: false, error: error.message };
    }
  }

  async createBot(botConfig) {
    try {
      const payload = {
        bot_id: botConfig.botId,
        bot_name: botConfig.botName,
        system_message: botConfig.systemMessage,
        model: botConfig.model,
        fallback_message: botConfig.fallback,
        tenant_id: botConfig.tenantId,
        owner_id: botConfig.ownerId,
      };

      console.log("🤖 Sending bot to Python RAG:", payload);

      const response = await axios.post(`${this.baseURL}/api/bots`, payload, {
        timeout: this.timeout,
      });

      console.log("✅ Bot created in Python RAG:", response.data);
      return { ok: true, data: response.data };
    } catch (error) {
      console.error("❌ Python RAG bot creation failed:", error.message);
      return {
        ok: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  async ingestFiles(botId, files) {
    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post(
        `${this.baseURL}/api/bots/${botId}/ingest`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000, // 60 seconds for file uploads
        }
      );

      console.log("✅ Files ingested in Python RAG:", response.data);
      return { ok: true, data: response.data };
    } catch (error) {
      console.error("❌ Python RAG file ingestion failed:", error.message);
      return {
        ok: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  async askQuestion(botId, question, userId) {
    try {
      const payload = {
        question,
        user_id: userId,
        bot_id: botId,
      };

      const response = await axios.post(`${this.baseURL}/api/ask`, payload, {
        timeout: this.timeout,
      });

      return { ok: true, data: response.data };
    } catch (error) {
      console.error("❌ Python RAG question failed:", error.message);
      return {
        ok: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }
}

export default new PythonRAGService();
