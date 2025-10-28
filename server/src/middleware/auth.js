// server/src/middleware/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// JWT Authentication Middleware with Internal Service support
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
  const internalToken = req.headers["x-internal-token"];

  // DEBUG: Log all incoming auth attempts
  console.log("🔐 AUTH MIDDLEWARE DEBUG - Incoming request:", {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader,
    hasInternalToken: !!internalToken,
  });

  // Option 1: Internal Service Authentication (for Python service)
  if (internalToken && internalToken === JWT_SECRET) {
    console.log("✅ Internal service authenticated");

    req.user = {
      userId: req.headers["x-user-id"] || "python-service",
      role: "service",
      email: "python-service@internal",
      isServiceAccount: true,
    };

    console.log("🔐 INTERNAL SERVICE AUTH - Normalized user:", req.user);
    return next();
  }

  // Option 2: JWT Token Authentication (for regular users)
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "access_denied",
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        ok: false,
        error: "invalid_token",
        message: "Invalid or expired token",
      });
    }

    // Normalize the user object
    req.user = {
      userId: decoded.userId || decoded._id,
      role: decoded.role,
      email: decoded.email,
      isServiceAccount: false,
    };

    console.log("🔐 JWT AUTH - Normalized user:", req.user);
    next();
  });
};

// Require client admin role
export const requireClientAdmin = (req, res, next) => {
  if (req.user.role !== "client_admin") {
    return res.status(403).json({
      ok: false,
      error: "insufficient_permissions",
      message: "Client admin access required",
    });
  }
  next();
};
