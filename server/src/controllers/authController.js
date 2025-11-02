import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Register new client
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    console.log("📝 Registration attempt for:", email);

    // Validation
    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "weak_password",
        message: "Password must be at least 8 characters",
      });
    }

    // Check if user exists in MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        ok: false,
        error: "email_exists",
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // 🎯 UPDATED: Include brandSettings in new user creation
    const newUser = new User({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      companyName,
      // 🎯 NEW: Initialize brand settings
      brandSettings: {
        primaryCompany: companyName,
        verifiedBrands: [],
        customBrands: [],
        tier: "basic",
      },
      role: "client_admin",
      isActive: true,
      plan: "starter",
    });

    await newUser.save();

    console.log("✅ User registered in MongoDB:", {
      id: newUser._id,
      email,
      companyName,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        email: newUser.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      ok: true,
      access_token: token,
      token_type: "bearer",
      user_id: newUser._id,
      role: newUser.role,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        companyName: newUser.companyName,
        // 🎯 NEW: Include brand settings in response
        brandSettings: newUser.brandSettings,
        plan: newUser.plan,
      },
    });
  } catch (error) {
    console.error("[auth:register] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// Login - Updated to include brand settings
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "missing_credentials",
        message: "Email and password are required",
      });
    }

    // Find user in MongoDB
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        ok: false,
        error: "invalid_credentials",
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      ok: true,
      access_token: token,
      token_type: "bearer",
      user_id: user._id,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        // 🎯 NEW: Include brand settings in response
        brandSettings: user.brandSettings,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("[auth:login] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// Get current user info - Updated to include brand settings
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "user_not_found",
        message: "User not found",
      });
    }

    res.json({
      ok: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        // 🎯 NEW: Include brand settings in response
        brandSettings: user.brandSettings,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("[auth:me] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Internal server error",
    });
  }
};
