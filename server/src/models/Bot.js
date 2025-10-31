// server/src/models/Bot.js
import mongoose from "mongoose";

const BotSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // nanoid
  botName: { type: String, required: true },
  model: { type: String, required: true },
  temperature: { type: Number, default: 0.7 },

  // 🎯 NEW TEMPLATE SYSTEM - REQUIRED FIELDS
  companyReference: { type: String, required: true },
  personalityType: {
    type: String,
    required: true,
    enum: ["friendly", "professional", "technical", "custom"],
    default: "professional",
  },
  safetyLevel: {
    type: String,
    required: true,
    enum: ["lenient", "standard", "strict", "custom"],
    default: "standard",
  },

  // 🎯 BRAND SYSTEM STRUCTURE
  brandContext: {
    primaryCompany: { type: String, required: true },
    verifiedBrands: [{ type: String }],
    customBrands: [{ type: String }],
    tier: {
      type: String,
      enum: ["basic", "pro", "enterprise"],
      default: "basic",
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified"],
      default: "unverified",
    },
  },

  currentBrand: {
    type: {
      type: String,
      enum: ["primary", "verified", "custom"],
      default: "primary",
    },
    reference: { type: String, required: true },
  },

  // 🎯 DERIVED PROMPTS (from templates + customizations)
  systemMessage: { type: String, required: true },
  guardrails: { type: String, required: true },
  greeting: { type: String, required: true },
  fallback: { type: String, required: true },

  // Existing fields
  escalation: {
    enabled: { type: Boolean, default: false },
    escalation_email: { type: String, default: "" },
  },
  files: [
    {
      filename: String,
      storedAs: String,
      size: Number,
      mimetype: String,
      uploadedBy: String,
      s3Url: String,
      s3Key: String,
      uploadedAt: Date,
    },
  ],

  ownerId: { type: String, required: true }, // User ID
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
BotSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Bot = mongoose.models.Bot || mongoose.model("Bot", BotSchema);
