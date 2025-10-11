// server/src/models/Bot.js
import mongoose from "mongoose";

const EscalationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    email: { type: String, default: "" },
  },
  { _id: false }
);

const FileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    storedAs: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    mimetype: { type: String, required: true },
  },
  { _id: false }
);

const BotSchema = new mongoose.Schema(
  {
    botName: { type: String, required: true, trim: true, maxlength: 50 },
    systemMessage: { type: String, default: "", maxlength: 2000 },
    personality: {
      type: String,
      enum: ["Friendly", "Professional", "Technical"],
      default: "Friendly",
    },
    model: {
      type: String,
      required: true,
      enum: ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet", "llama-3.1-70b"],
    },
    fallback: { type: String, default: "", maxlength: 200 },
    escalation: { type: EscalationSchema, default: () => ({}) },
    files: { type: [FileSchema], default: [] },

    // Multi-tenant fields - ADD THESE:
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Compound index for tenant isolation - ADD THIS:
BotSchema.index({ tenantId: 1, botName: 1 }, { unique: true });

export const Bot = mongoose.models.Bot || mongoose.model("Bot", BotSchema);
