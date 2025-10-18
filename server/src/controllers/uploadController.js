// server/src/controllers/uploadController.js
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import pythonService from "../../services/pythonService.js";
import axios from "axios";
import { readBots, writeBots } from "./botController.js";

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

export const uploadFiles = async (req, res, next) => {
  // Track if we've started processing to avoid duplicates
  let processingStarted = false;
  const processedFiles = []; // Track files we've processed

  try {
    console.log("=== UPLOAD DEBUG START ===");
    console.log("Request body:", req.body);
    console.log(
      "Request files:",
      req.files
        ? req.files.map((f) => ({
            originalname: f.originalname,
            filename: f.filename,
            path: f.path,
            size: f.size,
          }))
        : "No files"
    );
    console.log("User:", req.user);
    console.log("=== UPLOAD DEBUG END ===");

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "no_files",
        message: "No files uploaded",
      });
    }

    console.log(
      `📁 Received ${req.files.length} files from multer:`,
      req.files.map((f) => ({ original: f.originalname, stored: f.filename }))
    );

    const { botId } = req.body;
    if (!botId) {
      // Clean up uploaded files if botId is missing
      await cleanupFiles(req.files);
      return res.status(400).json({
        ok: false,
        error: "missing_bot_id",
        message: "botId is required",
      });
    }

    processingStarted = true;
    const results = [];
    const fileRecords = [];

    // Process each file with Python RAG service
    for (const file of req.files) {
      try {
        console.log(
          `🔍 Processing file: ${file.originalname} -> ${file.filename}`
        );

        // Check if this file was already processed (in case of retry)
        if (processedFiles.includes(file.filename)) {
          console.log(`⚠️ File ${file.filename} already processed, skipping`);
          continue;
        }

        processedFiles.push(file.filename);

        const pythonResponse = await axios.post(
          "http://localhost:8000/api/ingest",
          {
            bot_id: botId,
            paths: [file.path],
            user_id: req.user.userId,
            tenant_id: req.user.tenantId,
          }
        );

        // Create file record
        const fileRecord = {
          filename: file.originalname,
          storedAs: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          uploadedBy: req.user.userId,
          tenantId: req.user.tenantId,
          path: file.path,
          uploadedAt: new Date().toISOString(),
        };

        fileRecords.push(fileRecord);

        results.push({
          filename: file.originalname,
          storedAs: file.filename,
          success: true,
          chunks: pythonResponse.data.chunks_added || 0,
          path: file.path,
        });

        console.log(
          `✅ File ingested: ${file.originalname} -> ${file.filename} -> ${
            pythonResponse.data.chunks_added || 0
          } chunks`
        );
      } catch (error) {
        console.error(`❌ Failed to process ${file.originalname}:`, error);

        // Clean up the file that failed
        try {
          await fs.unlink(file.path);
          console.log(`🧹 Cleaned up failed upload: ${file.filename}`);
        } catch (cleanupError) {
          console.log(
            `⚠️ Could not clean up ${file.filename}:`,
            cleanupError.message
          );
        }

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
          // Replace files array with correct records
          botsData.bots[botIndex].files = fileRecords;
          botsData.bots[botIndex].updatedAt = new Date().toISOString();
          await writeBots(botsData);
          console.log(
            `✅ Updated bot ${botId} with ${fileRecords.length} files:`,
            fileRecords.map((f) => ({
              filename: f.filename,
              storedAs: f.storedAs,
            }))
          );
        } else {
          console.error(
            `❌ Bot ${botId} not found for user ${req.user.userId}`
          );
          // Clean up files if bot not found
          await cleanupFiles(req.files);
        }
      } catch (botError) {
        console.error("❌ Failed to update bot with file records:", botError);
        // Clean up files if update fails
        await cleanupFiles(req.files);
      }
    }

    res.json({
      ok: true,
      files: results,
      botId: botId,
      totalProcessed: fileRecords.length,
    });
  } catch (error) {
    // Clean up files on any error
    if (processingStarted && req.files) {
      await cleanupFiles(req.files);
    }
    next(error);
  }
};

// Helper function to clean up files
async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file.path);
      console.log(`🧹 Cleaned up: ${file.filename}`);
    } catch (error) {
      console.log(`⚠️ Could not clean up ${file.filename}:`, error.message);
    }
  }
}

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
