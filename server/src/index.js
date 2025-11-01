// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import uploadsRoutes from "./routes/uploads.js";
import botsRoutes from "./routes/bots.js";
import { requestLogger, errorLogger } from "./lib/logger.js";
import { ensureUploadDir } from "./lib/fsutil.js";
import { connectMongoose } from "./lib/mongo.js"; // CHANGED: connectMongoose instead of connectMongo
import authRoutes from "./routes/auth.js";
import ragRoutes from "./routes/rag.js";
import chatRoutes from "./routes/chat.js";
import evaluateRoutes from "./routes/evaluate.js";
import { sanitizeInput } from "./middleware/sanitizeHtmlMiddleware.js";
import inspectionRoutes from "./routes/inspection.js";
import getTemplates from "./routes/templates.js";

async function main() {
  // Connect to MongoDB (REPLACED the commented section)
  try {
    await connectMongoose();
    console.log("✅ MongoDB connected via Mongoose");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }

  // Note: We don't need ensureUploadDir anymore since we're using S3 memory storage
  // But keeping it for now for compatibility
  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  await ensureUploadDir(uploadDir);

  const app = express();

  // ========================
  // ENHANCED SECURITY MIDDLEWARE
  // ========================

  // 1. Helmet - Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Rate limiting configuration
  const rateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 100 : 1000,
    message: {
      ok: false,
      error: "rate_limit_exceeded",
      message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  const limiter = rateLimit(rateLimitConfig);
  app.use(limiter);

  // More aggressive rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: {
      ok: false,
      error: "auth_rate_limit",
      message: "Too many authentication attempts, please try again later.",
    },
  });

  // 3. CORS configuration
  const corsOptions = {
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL]
        : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));

  // 4. Body parsing with limits
  app.use(
    express.json({
      limit: "10mb",
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: "10mb",
    })
  );

  // 5. Custom HTML Sanitization
  app.use(sanitizeInput);

  // 6. HTTP Parameter Pollution protection
  app.use(hpp());

  // 7. Request logging
  app.use(requestLogger);

  // ========================
  // ROUTES
  // ========================

  // Health & readiness (no rate limiting for health checks)
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.get("/api/ready", (_req, res) => {
    res.send("ok");
  });

  app.get("/api/python-health", async (req, res) => {
    try {
      const pythonService = await import("../services/pythonService.js");
      const health = await pythonService.default.healthCheck();

      res.json({
        ok: true,
        pythonService: {
          status: health.ok ? "connected" : "disconnected",
          baseURL: process.env.PYTHON_RAG_URL || "http://localhost:8000",
          details: health.ok ? health.data : health.error,
        },
      });
    } catch (error) {
      res.json({
        ok: false,
        pythonService: {
          status: "error",
          error: error.message,
        },
      });
    }
  });

  // MongoDB health check (NEW)
  app.get("/api/mongo-health", async (_req, res) => {
    try {
      const mongoose = await import("mongoose");
      const status = mongoose.connection.readyState;
      const statusText = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      }[status];

      res.json({
        ok: status === 1,
        status: statusText,
        db: mongoose.connection.db?.databaseName || "unknown",
      });
    } catch (error) {
      res.json({
        ok: false,
        status: "error",
        error: error.message,
      });
    }
  });

  // Apply auth rate limiting to auth routes
  app.use("/api/auth", authLimiter);

  // Optionally serve uploaded files (useful for previews) - Still useful for any legacy files
  app.use("/uploads", express.static(path.resolve(process.cwd(), uploadDir)));

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/uploads", uploadsRoutes);
  app.use("/api/bots", botsRoutes);
  app.use("/api/rag", ragRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/inspect", inspectionRoutes);
  app.use("/api/evaluate", evaluateRoutes);
  app.use("/api/templates", getTemplates);

  app.get("/api/debug/collections", async (req, res) => {
    try {
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      const collectionInfo = await Promise.all(
        collections.map(async (coll) => {
          const count = await mongoose.connection.db
            .collection(coll.name)
            .countDocuments();
          return {
            name: coll.name,
            count: count,
            sample:
              count > 0
                ? await mongoose.connection.db.collection(coll.name).findOne()
                : null,
          };
        })
      );

      res.json(collectionInfo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================
  // ERROR HANDLING
  // ========================

  // 404 handler
  app.use((req, res) => {
    res
      .status(404)
      .json({ ok: false, error: "not_found", path: req.originalUrl });
  });

  // Error handling
  app.use(errorLogger);
  app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);

    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message;

    res.status(500).json({
      ok: false,
      error: "server_error",
      message: message,
    });
  });

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🔒 Secure API running on http://localhost:${port}`);
    console.log(`📊 Rate limiting: ${rateLimitConfig.max} requests per 15min`);
    console.log(`🗄️  MongoDB: Connected to rag-platform database`);
  });
}

main().catch((err) => {
  console.error("Boot failure:", err);
  process.exit(1);
});
