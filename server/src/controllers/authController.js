// server/src/controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Path to users JSON file
const USERS_FILE = path.join(__dirname, "../../data/users/users.json");

// Generate tenant ID
function generateTenantId() {
  return "tenant_" + Math.random().toString(36).substr(2, 9);
}

// Helper function to read users from JSON
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default structure
    return { users: [], lastId: 0 };
  }
}

// Helper function to write users to JSON
async function writeUsers(usersData) {
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
}

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

    // Read existing users
    const usersData = await readUsers();

    console.log("📋 Current users in JSON:", usersData.users.length);
    console.log("📁 Users file path:", USERS_FILE);
    // Check if user exists
    const existingUser = usersData.users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

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
    const userId = (usersData.lastId + 1).toString();

    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      companyName,
      tenantId,
      role: "client_admin",
      isActive: true,
      plan: "starter",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add user to data and update lastId
    usersData.users.push(newUser);
    usersData.lastId = parseInt(userId);

    // Write back to file
    await writeUsers(usersData);

    console.log("✅ User registered:", { id: userId, email, tenantId });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        tenantId: newUser.tenantId,
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
      user_id: newUser.id,
      tenant_id: newUser.tenantId,
      role: newUser.role,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        companyName: newUser.companyName,
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

// Login - Updated to use JSON file
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

    // Read users from JSON file
    const usersData = await readUsers();

    // Find user
    const user = usersData.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.isActive
    );

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
        userId: user.id,
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
      user_id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
      user: {
        id: user.id,
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

// Get current user info - Updated for JSON
export const getCurrentUser = async (req, res) => {
  try {
    const usersData = await readUsers();
    const user = usersData.users.find((u) => u.id === req.user.userId);

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
        id: user.id,
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
