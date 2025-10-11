// server/src/controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Generate tenant ID
function generateTenantId() {
  return "tenant_" + Math.random().toString(36).substr(2, 9);
}

// Register new client
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        error: "weak_password",
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        error: "email_exists",
        message: "Email already registered",
      });
    }

    // Create tenant and user
    const tenantId = generateTenantId();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      companyName,
      tenantId,
      role: "client_admin",
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      ok: true,
      access_token: token,
      token_type: "bearer",
      user_id: user._id.toString(),
      tenant_id: user.tenantId,
      role: user.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        plan: user.plan,
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

// Login
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

    // Find user
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
        userId: user._id.toString(),
        tenantId: user.tenantId,
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
      user_id: user._id.toString(),
      tenant_id: user.tenantId,
      role: user.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
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

// Get current user info
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
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        role: user.role,
        tenantId: user.tenantId,
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
