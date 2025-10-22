// server/src/models/Bot.js - UPDATED
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: String,
    storedAs: String,
    size: Number,
    mimetype: String,
    uploadedBy: String,
    tenantId: String,
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
  botName: { type: String, required: true },
  model: { type: String, required: true },
  systemMessage: String,
  fallback: String,
  greeting: String,
  guardrails: String,
  temperature: { type: Number, default: 0.7 },
  escalation: escalationSchema,
  files: [fileSchema],
  tenantId: { type: String, required: true },
  ownerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Bot = mongoose.model("Bot", botSchema);
