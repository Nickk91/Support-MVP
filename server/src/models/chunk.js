import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    bot_id: { type: String, required: true, index: true },
    document_path: { type: String, required: true, index: true },
    chunk_id: { type: String, required: true },
    chunk_index: { type: Number, required: true },
    content: { type: String, required: true },
    token_count: { type: Number },
    page_number: { type: Number },
    metadata: { type: Object },
    chunking_strategy: { type: String },
    vector_embedding: { type: [Number], index: true },
  },
  {
    timestamps: true,
  }
);

// Change from default export to named export
export const Chunk = mongoose.model("Chunk", chunkSchema);
