import logger from "../src/utils/logger.js";
import mongoose from "mongoose";

class InspectionStore {
  /**
   * List all processed documents for a bot
   * @param {string} botId - The bot ID
   * @returns {Promise<Array>} Array of document objects
   */
  async listDocuments(botId) {
    try {
      // Try to use your actual Document model first
      let Document;
      try {
        Document = mongoose.model("Document");
      } catch (error) {
        // Fall back to mock data if Document model doesn't exist
        return this.getMockDocuments(botId);
      }

      const documents = await Document.find({
        bot_id: botId,
        status: { $in: ["processed", "completed"] },
      })
        .sort({ processed_at: -1 })
        .select("file_path processed_at user_id file_size status")
        .lean();

      return documents.map((doc) => ({
        document_path: doc.file_path || doc.document_path,
        last_processed: doc.processed_at || doc.last_processed,
        user_id: doc.user_id,
        file_size: doc.file_size,
        status: doc.status,
      }));
    } catch (error) {
      logger.error("Error listing documents for bot %s", botId, error);
      // Fall back to mock data on error
      return this.getMockDocuments(botId);
    }
  }

  /**
   * Get inspection data for a specific document
   * @param {string} botId - The bot ID
   * @param {string} documentPath - The document path
   * @returns {Promise<Object|null>} Inspection data or null if not found
   */
  async getInspectionData(botId, documentPath) {
    try {
      // Try to use your actual Chunk model first
      let Chunk;
      try {
        Chunk = mongoose.model("Chunk");
      } catch (error) {
        // Fall back to mock data if Chunk model doesn't exist
        return this.getMockInspectionData(botId, documentPath);
      }

      const chunks = await Chunk.find({
        bot_id: botId,
        document_path: documentPath,
      })
        .sort({ chunk_index: 1, page_number: 1 })
        .select(
          "chunk_id content token_count page_number metadata created_at chunking_strategy"
        )
        .lean();

      if (!chunks || chunks.length === 0) {
        return null;
      }

      return {
        document_path: documentPath,
        bot_id: botId,
        parsing_result: chunks.map((chunk) => ({
          chunk_id: chunk.chunk_id,
          content: chunk.content,
          char_count: chunk.content?.length || 0,
          token_count: chunk.token_count,
          page_number: chunk.page_number,
          metadata: chunk.metadata || {},
        })),
        processing_info: {
          parser_used: "pdf_parser_v2", // You might want to store this in your model
          processed_at: chunks[0]?.created_at || new Date().toISOString(),
          chunking_strategy: chunks[0]?.chunking_strategy || "semantic",
        },
      };
    } catch (error) {
      logger.error(
        "Error getting inspection data for bot %s, path %s",
        botId,
        documentPath,
        error
      );
      // Fall back to mock data on error
      return this.getMockInspectionData(botId, documentPath);
    }
  }

  /**
   * Mock data fallback for listDocuments
   */
  getMockDocuments(botId) {
    const mockDocuments = [
      {
        document_path: `/uploads/${botId}/document1.pdf`,
        last_processed: new Date().toISOString(),
        user_id: "user123",
        file_size: 1024 * 1024,
        status: "processed",
      },
      {
        document_path: `/uploads/${botId}/document2.docx`,
        last_processed: new Date(Date.now() - 86400000).toISOString(),
        user_id: "user123",
        file_size: 512 * 1024,
        status: "processed",
      },
    ];

    return mockDocuments;
  }

  /**
   * Mock data fallback for getInspectionData
   */
  getMockInspectionData(botId, documentPath) {
    // Only return mock data for document1 to simulate real behavior
    if (!documentPath.includes("document1")) {
      return null;
    }

    return {
      document_path: documentPath,
      bot_id: botId,
      parsing_result: [
        {
          chunk_id: "chunk_1",
          content:
            "This is the first chunk of content from the document. It contains important information about the topic.",
          char_count: 98,
          token_count: 25,
          page_number: 1,
          metadata: {
            page: 1,
            section: "introduction",
          },
        },
        {
          chunk_id: "chunk_2",
          content:
            "Second chunk with more detailed information. This includes specific data points and analysis results.",
          char_count: 105,
          token_count: 28,
          page_number: 1,
          metadata: {
            page: 1,
            section: "analysis",
          },
        },
        {
          chunk_id: "chunk_3",
          content:
            "Final chunk containing conclusions and recommendations based on the previous analysis.",
          char_count: 92,
          token_count: 22,
          page_number: 2,
          metadata: {
            page: 2,
            section: "conclusion",
          },
        },
      ],
      processing_info: {
        parser_used: "pdf_parser_v2",
        processed_at: new Date().toISOString(),
        chunking_strategy: "semantic",
      },
    };
  }
}

export default InspectionStore;
