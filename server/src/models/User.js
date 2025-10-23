// server/src/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // MongoDB will provide _id as ObjectId (user's unique identifier)
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
    role: {
      type: String,
      enum: ["client_admin", "end_user"],
      default: "client_admin",
    },
    isActive: { type: Boolean, default: true },
    // REMOVED: tenantId field entirely
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
