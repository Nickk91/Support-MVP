// server/src/middleware/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// JWT Authentication Middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "access_denied",
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        ok: false,
        error: "invalid_token",
        message: "Invalid or expired token",
      });
    }
    req.user = user;
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
