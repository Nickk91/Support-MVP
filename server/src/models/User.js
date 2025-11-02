// server/src/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },

    // 🎯 NEW: Brand management system
    brandSettings: {
      primaryCompany: {
        type: String,
        required: true,
        default: function () {
          return this.companyName;
        },
      },
      verifiedBrands: [
        {
          name: { type: String, required: true },
          isActive: { type: Boolean, default: true },
          verifiedAt: { type: Date },
        },
      ],
      customBrands: [
        {
          name: { type: String, required: true },
          isActive: { type: Boolean, default: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      tier: {
        type: String,
        enum: ["basic", "pro", "enterprise"],
        default: "basic",
      },
    },

    role: {
      type: String,
      enum: ["client_admin", "end_user"],
      default: "client_admin",
    },
    isActive: { type: Boolean, default: true },
    plan: {
      type: String,
      enum: ["starter", "pro", "enterprise"],
      default: "starter",
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
