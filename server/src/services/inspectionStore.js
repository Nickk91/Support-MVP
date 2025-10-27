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

      // No documents found - return empty array
      console.log(
        `ℹ️ No documents found in MongoDB for bot ${botId} - returning empty array`
      );
      return [];
    } catch (error) {
      console.error("❌ Error listing documents from MongoDB:", error);
      // Return empty array on error as well
      return [];
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

      // No chunks found for this document - return null
      console.log(
        `ℹ️ No chunks found in MongoDB for ${documentPath} - document may not exist or processing failed`
      );
      return null;
    } catch (error) {
      console.error("❌ Error getting inspection data from MongoDB:", error);
      // Return null on error
      return null;
    }
  }

  // Remove mock data methods entirely since we don't need them anymore
  // getMockDocuments() and getMockInspectionData() removed
}

export default InspectionStore;
