import mongoose from "mongoose";

class InspectionStore {
  async listDocuments(botId) {
    try {
      const db = mongoose.connection.db;
      const documents = await db
        .collection("documents")
        .find({ bot_id: botId })
        .sort({ processed_at: -1 })
        .toArray();

      if (documents.length > 0) {
        console.log(
          `✅ Found ${documents.length} real documents in MongoDB for bot ${botId}`
        );
        return documents.map((doc) => ({
          document_path: doc.document_path,
          last_processed: doc.processed_at,
          user_id: doc.user_id || "unknown",
          file_size: doc.file_size || 0,
          status: doc.status || "processed",
          chunk_count: doc.chunk_count || 0,
        }));
      }

      // Fallback to mock data if no documents found
      console.log(
        `⚠️ No documents found in MongoDB for bot ${botId}, using mock data`
      );
      return this.getMockDocuments(botId);
    } catch (error) {
      console.error("❌ Error listing documents from MongoDB:", error);
      return this.getMockDocuments(botId);
    }
  }

  async getInspectionData(botId, documentPath) {
    try {
      const db = mongoose.connection.db;

      const chunks = await db
        .collection("chunks")
        .find({
          bot_id: botId,
          document_path: documentPath,
        })
        .sort({ chunk_index: 1 })
        .toArray();

      if (chunks && chunks.length > 0) {
        console.log(
          `✅ Found ${chunks.length} real chunks in MongoDB for ${documentPath}`
        );
        return {
          document_path: documentPath,
          bot_id: botId,
          parsing_result: chunks.map((chunk) => ({
            chunk_id: chunk.chunk_id,
            content: chunk.content,
            char_count: chunk.char_count || chunk.content?.length || 0,
            token_count: chunk.token_count,
            page_number: chunk.page_number,
            metadata: chunk.metadata || {},
          })),
          processing_info: {
            processed_at: chunks[0]?.created_at,
            chunk_count: chunks.length,
          },
        };
      }

      // Fallback to mock data if no chunks found
      console.log(
        `⚠️ No chunks found in MongoDB for ${documentPath}, using mock data`
      );
      return this.getMockInspectionData(botId, documentPath);
    } catch (error) {
      console.error("❌ Error getting inspection data from MongoDB:", error);
      return this.getMockInspectionData(botId, documentPath);
    }
  }

  getMockDocuments(botId) {
    // Keep as fallback
    return [
      {
        document_path: `/uploads/${botId}/document1.pdf`,
        last_processed: new Date().toISOString(),
        user_id: "user123",
        file_size: 1024 * 1024,
        status: "processed",
      },
    ];
  }

  getMockInspectionData(botId, documentPath) {
    // Keep as fallback
    if (!documentPath.includes("document1")) return null;

    return {
      document_path: documentPath,
      bot_id: botId,
      parsing_result: [
        {
          chunk_id: "chunk_1",
          content: "Mock data - no real chunks found",
          char_count: 98,
          token_count: 25,
          page_number: 1,
          metadata: { page: 1, section: "introduction" },
        },
      ],
      processing_info: {
        processed_at: new Date().toISOString(),
        chunk_count: 1,
      },
    };
  }
}

export default InspectionStore;
