// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";

import uploadsRoutes from "./routes/uploads.js";
import botsRoutes from "./routes/bots.js";
import { requestLogger, errorLogger } from "./lib/logger.js";
import { ensureUploadDir } from "./lib/fsutil.js";
import { connectMongo } from "./lib/mongo.js";

async function main() {
  // Connect to Mongo if enabled
  if (process.env.USE_MONGO === "1") {
    await connectMongo(process.env.MONGODB_URI);
    console.log("[mongo] connected");
  }

  // Ensure upload directory exists
  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  await ensureUploadDir(uploadDir);

  const app = express();

  // Middleware
  app.use(cors({ origin: true })); // TODO: lock down allowed origins in prod
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLogger);

  // Health & readiness
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });
  app.get("/api/ready", (_req, res) => {
    res.send("ok");
  });

  // Optionally serve uploaded files (useful for previews)
  app.use("/uploads", express.static(path.resolve(process.cwd(), uploadDir)));

  // Routes
  app.use("/api/uploads", uploadsRoutes);
  app.use("/api/bots", botsRoutes);

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
    res.status(500).json({
      ok: false,
      error: "server_error",
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message,
    });
  });

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Boot failure:", err);
  process.exit(1);
});
