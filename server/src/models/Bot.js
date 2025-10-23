// server/src/models/Bot.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: String,
    storedAs: String,
    size: Number,
    mimetype: String,
    uploadedBy: { type: String, required: true }, // ✅ Changed from ObjectId to String
    s3Url: String,
    s3Key: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const escalationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    escalation_email: String,
  },
  { _id: false }
);

const botSchema = new mongoose.Schema({
  _id: { type: String },
  botName: { type: String, required: true },
  model: { type: String, required: true },
  systemMessage: String,
  fallback: String,
  greeting: String,
  guardrails: String,
  temperature: { type: Number, default: 0.1 },
  escalation: escalationSchema,
  files: [fileSchema],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Bot = mongoose.model("Bot", botSchema);
