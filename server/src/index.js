import "dotenv/config";
import express from "express";
import cors from "cors";
import uploadsRoutes from "./routes/uploads.js";
import botsRoutes from "./routes/bots.js";
import { requestLogger, errorLogger } from "./lib/logger.js";
import { ensureUploadDir } from "./lib/fsutil.js";

async function main() {
  // Ensure upload directory exists
  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  await ensureUploadDir(uploadDir);

  const app = express();

  // Middleware
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLogger);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // Debug route - add this temporarily
  app.get("/api/debug", (req, res) => {
    res.json({
      message: "Debug route works!",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/debug-upload", (req, res) => {
    console.log("Debug upload hit - headers:", req.headers);
    res.json({ message: "Debug upload works!", body: req.body });
  });

  // 🔊 Routes with debug middleware
  console.log("[INDEX] Mounting uploads routes");
  app.use(
    "/api/uploads",
    (req, res, next) => {
      console.log(
        `[INDEX] Uploads route accessed: ${req.method} ${req.originalUrl}`
      );
      next();
    },
    uploadsRoutes
  );

  app.use("/api/bots", botsRoutes);

  // 404 handler
  app.use((req, res) => {
    res
      .status(404)
      .json({ ok: false, error: "not_found", path: req.originalUrl });
  });

  // Error handling
  app.use(errorLogger);
  app.use((err, req, res, next) => {
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
  app.listen(port, () =>
    console.log(`API running on http://localhost:${port}`)
  );
}

main().catch((err) => {
  console.error("Boot failure:", err);
  process.exit(1);
});
