import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pythonService from "../../services/pythonService.js";
import axios from "axios";
import { readBots, writeBots } from "./botController.js";

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for memory storage (we'll stream to S3)
const storage = multer.memoryStorage();

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
  let processingStarted = false;
  const processedFiles = [];

  try {
    console.log("=== UPLOAD DEBUG START ===");
    console.log("Request body:", req.body);
    console.log(
      "Request files:",
      req.files
        ? req.files.map((f) => ({
            originalname: f.originalname,
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
      req.files.map((f) => ({ original: f.originalname, size: f.size }))
    );

    const { botId } = req.body;
    if (!botId) {
      return res.status(400).json({
        ok: false,
        error: "missing_bot_id",
        message: "botId is required",
      });
    }

    processingStarted = true;
    const results = [];
    const fileRecords = [];

    // Process each file - upload to S3 and ingest to RAG
    for (const file of req.files) {
      try {
        console.log(`🔍 Processing file: ${file.originalname}`);

        if (processedFiles.includes(file.originalname)) {
          console.log(
            `⚠️ File ${file.originalname} already processed, skipping`
          );
          continue;
        }

        processedFiles.push(file.originalname);

        // Generate S3 file key
        const fileKey = `${nanoid()}__${file.originalname.replace(
          /[^\w.\-]+/g,
          "_"
        )}`;

        // Upload to S3
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalName: file.originalname,
            uploadedBy: req.user.userId || "unknown",
            tenantId: req.user.tenantId || "unknown",
            botId: botId,
          },
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct S3 URL for Python ingestion
        const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${fileKey}`;

        console.log(`✅ File uploaded to S3: ${file.originalname} -> ${s3Url}`);

        // Ingest file via Python RAG service using S3 URL
        const pythonResponse = await axios.post(
          "http://localhost:8000/api/ingest",
          {
            bot_id: botId,
            paths: [s3Url], // Pass S3 URL instead of local path
            user_id: req.user.userId,
            tenant_id: req.user.tenantId,
          }
        );

        // Create file record with S3 info
        const fileRecord = {
          filename: file.originalname,
          storedAs: fileKey,
          size: file.size,
          mimetype: file.mimetype,
          uploadedBy: req.user.userId,
          tenantId: req.user.tenantId,
          s3Url: s3Url,
          s3Key: fileKey,
          uploadedAt: new Date().toISOString(),
        };

        fileRecords.push(fileRecord);

        results.push({
          filename: file.originalname,
          storedAs: fileKey,
          success: true,
          chunks: pythonResponse.data.chunks_added || 0,
          s3Url: s3Url,
        });

        console.log(
          `✅ File ingested from S3: ${file.originalname} -> ${
            pythonResponse.data.chunks_added || 0
          } chunks`
        );
      } catch (error) {
        console.error(`❌ Failed to process ${file.originalname}:`, error);

        results.push({
          filename: file.originalname,
          success: false,
          error: error.message,
        });
      }
    }

    // Update bot with file records (S3 info)
    if (fileRecords.length > 0) {
      try {
        const botsData = await readBots();
        const botIndex = botsData.bots.findIndex(
          (bot) => bot.id === botId && bot.ownerId === req.user.userId
        );

        if (botIndex !== -1) {
          // Replace files array with S3 file records
          botsData.bots[botIndex].files = fileRecords;
          botsData.bots[botIndex].updatedAt = new Date().toISOString();
          await writeBots(botsData);
          console.log(
            `✅ Updated bot ${botId} with ${fileRecords.length} S3 files:`,
            fileRecords.map((f) => ({
              filename: f.filename,
              s3Key: f.s3Key,
            }))
          );
        } else {
          console.error(
            `❌ Bot ${botId} not found for user ${req.user.userId}`
          );
        }
      } catch (botError) {
        console.error(
          "❌ Failed to update bot with S3 file records:",
          botError
        );
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

// Error handler middleware (unchanged)
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
