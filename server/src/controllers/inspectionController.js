// server\src\controllers\inspectionController.js

import InspectionStore from "../services/inspectionStore.js";
import logger from "../utils/logger.js";

const inspectionController = {
  /**
   * Get list of all processed documents for a bot
   */
  listDocuments: async (req, res) => {
    try {
      const { botId } = req.params;
      const store = new InspectionStore();
      const documents = await store.listDocuments(botId);

      res.json({
        bot_id: botId,
        documents: documents,
        count: documents.length,
      });
    } catch (error) {
      logger.error(
        "Failed to list documents for botId=%s",
        req.params.botId,
        error
      );
      res.status(400).json({
        error: error.message || "Failed to load documents",
      });
    }
  },

  /**
   * Get parsing results for a specific document
   */
  inspectDocument: async (req, res) => {
    try {
      const { botId, documentPath } = req.params;
      const decodedDocumentPath = decodeURIComponent(documentPath);

      const store = new InspectionStore();
      const inspectionData = await store.getInspectionData(
        botId,
        decodedDocumentPath
      );

      if (!inspectionData) {
        return res.status(404).json({
          error: "Document not found or not processed",
        });
      }

      // Add summary statistics for the UI
      const chunks = inspectionData.parsing_result || [];
      const totalChunks = chunks.length;
      const totalChars = chunks.reduce(
        (sum, chunk) => sum + (chunk.char_count || 0),
        0
      );

      // Extract unique pages
      const pages = [
        ...new Set(
          chunks
            .map((chunk) => chunk.metadata?.page)
            .filter((page) => page !== undefined && page !== null)
        ),
      ];

      inspectionData.summary = {
        total_chunks: totalChunks,
        total_characters: totalChars,
        pages_processed: pages.length,
        average_chunk_size:
          totalChunks > 0 ? Math.round(totalChars / totalChunks) : 0,
      };

      res.json(inspectionData);
    } catch (error) {
      logger.error(
        "Failed to inspect document botId=%s, path=%s",
        req.params.botId,
        req.params.documentPath,
        error
      );
      res.status(400).json({
        error: error.message || "Failed to load document details",
      });
    }
  },

  /**
   * Test a query against a specific document
   */
  testDocumentQuery: async (req, res) => {
    try {
      const { botId, documentPath } = req.params;
      const { query } = req.body;
      const decodedDocumentPath = decodeURIComponent(documentPath);

      if (!query || !query.trim()) {
        return res.status(400).json({
          error: "Query is required",
        });
      }

      const store = new InspectionStore();
      const inspectionData = await store.getInspectionData(
        botId,
        decodedDocumentPath
      );

      if (!inspectionData) {
        return res.status(404).json({
          error: "Document not found",
        });
      }

      // Simple keyword matching (mimicking Python implementation)
      const queryLower = query.toLowerCase();
      const matchingChunks = [];

      const chunks = inspectionData.parsing_result || [];
      for (const chunk of chunks) {
        const contentLower = (chunk.content || "").toLowerCase();
        if (contentLower.includes(queryLower)) {
          matchingChunks.push({
            chunk_id: chunk.chunk_id,
            content_preview:
              chunk.content.length > 200
                ? chunk.content.substring(0, 200) + "..."
                : chunk.content,
            page: chunk.page_number,
            char_count: chunk.char_count,
            relevance_score: "keyword_match", // Simple scoring for now
          });
        }
      }

      res.json({
        query: query,
        document: decodedDocumentPath,
        matching_chunks: matchingChunks,
        matches_found: matchingChunks.length,
        message: `Found ${matchingChunks.length} chunks containing your query terms`,
      });
    } catch (error) {
      logger.error(
        "Test query failed for botId=%s, path=%s",
        req.params.botId,
        req.params.documentPath,
        error
      );
      res.status(400).json({
        error: error.message || "Failed to test query",
      });
    }
  },
};

export default inspectionController;
