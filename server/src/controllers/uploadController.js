// server/src/controllers/uploadController.js
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import pythonService from "../../services/pythonService.js";
import axios from "axios";

// Configure multer (moved from routes)
const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = nanoid();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${id}__${safe}`);
  },
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

// File upload handler
// File upload handler - ENHANCED
export const uploadFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "no_files",
        message: "No files uploaded",
      });
    }

    const { botId } = req.body;
    if (!botId) {
      return res.status(400).json({
        ok: false,
        error: "missing_bot_id",
        message: "botId is required",
      });
    }

    const results = [];
    const fileRecords = [];

    // Process each file with Python RAG service
    for (const file of req.files) {
      try {
        // Call Python ingest service
        const pythonResponse = await axios.post(
          "http://localhost:8000/api/ingest",
          {
            bot_id: botId,
            paths: [file.path],
            user_id: req.user.userId,
            tenant_id: req.user.tenantId,
          }
        );

        // Create file record for bot
        const fileRecord = {
          filename: file.originalname,
          storedAs: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          uploadedBy: req.user.userId,
          tenantId: req.user.tenantId,
          path: file.path,
        };

        fileRecords.push(fileRecord);

        results.push({
          filename: file.originalname,
          success: true,
          chunks: pythonResponse.data.chunks_added || 0,
          path: file.path,
        });

        console.log(
          `✅ File ingested: ${file.originalname} -> ${
            pythonResponse.data.chunks_added || 0
          } chunks`
        );
      } catch (error) {
        console.error(`Failed to process ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message,
        });
      }
    }

    // Update bot with file records
    if (fileRecords.length > 0) {
      try {
        const botsData = await readBots();
        const botIndex = botsData.bots.findIndex(
          (bot) => bot.id === botId && bot.ownerId === req.user.userId
        );

        if (botIndex !== -1) {
          botsData.bots[botIndex].files = [
            ...(botsData.bots[botIndex].files || []),
            ...fileRecords,
          ];
          botsData.bots[botIndex].updatedAt = new Date().toISOString();
          await writeBots(botsData);
          console.log(
            `✅ Updated bot ${botId} with ${fileRecords.length} new files`
          );
        }
      } catch (botError) {
        console.error("Failed to update bot with file records:", botError);
      }
    }

    res.json({
      ok: true,
      files: results,
      botId: botId,
      totalProcessed: fileRecords.length,
    });
  } catch (error) {
    next(error);
  }
};

// Error handler middleware
export const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        ok: false,
        error: "file_too_large",
        message: "File size too large (max 25MB)",
      });
    }
  }
  next(error);
};
