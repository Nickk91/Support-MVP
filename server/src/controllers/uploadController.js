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

    // Process each file with Python RAG service
    for (const file of req.files) {
      try {
        // Call Python ingest service
        const pythonResponse = await axios.post(
          "http://localhost:8000/api/ingest",
          {
            bot_id: botId,
            paths: [file.path], // Send file path to Python
            user_id: req.user?.id,
            tenant_id: req.user?.tenant_id,
          }
        );

        results.push({
          filename: file.originalname,
          success: true,
          chunks: pythonResponse.data.chunks_added,
          path: file.path,
        });
      } catch (error) {
        console.error(`Failed to process ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      ok: true,
      files: results,
      botId: botId,
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
