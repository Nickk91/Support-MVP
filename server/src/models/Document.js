// server\src\models\Document.js
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    bot_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    file_path: { type: String, required: true },
    file_name: { type: String, required: true },
    file_size: { type: Number },
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed", "completed"],
      default: "uploaded",
    },
    processed_at: { type: Date },
    chunk_count: { type: Number, default: 0 },
    error_message: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Document", documentSchema);
