import "dotenv/config";
import express from "express";
import cors from "cors";

import uploadsRoutes from "./routes/uploads.js";
import botsRoutes from "./routes/bots.js";
import { requestLogger, errorLogger } from "./lib/logger.js";


const app = express();

// ----- Middleware -----
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger); // our logger

// ----- Health check -----
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ----- Routes -----
app.use("/api/uploads", uploadsRoutes);
app.use("/api/bots", botsRoutes);

// ----- 404 handler -----
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "not_found",
    path: req.originalUrl,
  });
});

// ----- Error logger & handler -----
app.use(errorLogger); // log errors
app.use((err, req, res, next) => {
  res.status(500).json({
    ok: false,
    error: "server_error",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

// ----- Start server -----
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
