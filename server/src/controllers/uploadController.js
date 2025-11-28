// server\src\controllers\uploadController.js

import multer from "multer";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { updateBotFiles } from "./botController.js";
import pythonService from "../services/pythonService.js";

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

// 🎯 NEW: Define chunk limits per user tier
const CHUNK_LIMITS = {
  FREE_TIER: 100,
  PREMIUM_TIER: 1000,
  ENTERPRISE_TIER: 10000,
};

// 🎯 NEW: Helper function to get user tier
const getUserTier = (userId, userRole) => {
  // For now, return FREE_TIER for all users
  // Later, you can implement based on user subscription or role
  return "FREE_TIER";
};

// 🎯 NEW: Helper function to get chunk limit for user
const getUserChunkLimit = (userId, userRole) => {
  const userTier = getUserTier(userId, userRole);
  return CHUNK_LIMITS[userTier] || CHUNK_LIMITS.FREE_TIER;
};

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

    // 🎯 NEW: Get chunk limit for this user
    const maxChunksPerBot = getUserChunkLimit(req.user.userId, req.user.role);
    console.log(
      `🎯 CHUNK LIMIT - User ${req.user.userId} limit: ${maxChunksPerBot} chunks`
    );

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
            botId: botId,
          },
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct S3 URL for Python ingestion
        const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${fileKey}`;

        console.log(`✅ File uploaded to S3: ${file.originalname} -> ${s3Url}`);

        // 🎯 UPDATED: Ingest file with chunk limit
        try {
          const ingestResult = await pythonService.ingestFiles(
            botId,
            [s3Url], // Pass S3 URL instead of local path
            req.user.userId,
            req.user.tenantId,
            req.user.role,
            maxChunksPerBot // 🎯 NEW: Pass chunk limit
          );

          // Create file record with S3 info
          const fileRecord = {
            filename: file.originalname,
            storedAs: fileKey,
            size: file.size,
            mimetype: file.mimetype,
            uploadedBy: req.user.userId, // ✅ Use actual user ID, not placeholder
            s3Url: s3Url,
            s3Key: fileKey,
            uploadedAt: new Date().toISOString(),
          };

          fileRecords.push(fileRecord);

          results.push({
            filename: file.originalname,
            storedAs: fileKey,
            success: true,
            chunks: ingestResult.chunks_added || 0,
            s3Url: s3Url,
            message: `Successfully processed and ingested ${file.originalname}`,
            // 🎯 NEW: Include limit info in response
            limit_info: ingestResult.limit_info || null,
          });

          console.log(
            `✅ File ingested from S3: ${file.originalname} -> ${
              ingestResult.chunks_added || 0
            } chunks (limit: ${maxChunksPerBot})`
          );
        } catch (ingestError) {
          console.error(
            `❌ Python service ingestion failed for ${file.originalname}:`,
            ingestError.message
          );

          // Even if ingestion fails, we still record the file in S3
          const fileRecord = {
            filename: file.originalname,
            storedAs: fileKey,
            size: file.size,
            mimetype: file.mimetype,
            uploadedBy: req.user.userId,
            s3Url: s3Url,
            s3Key: fileKey,
            uploadedAt: new Date().toISOString(),
          };

          fileRecords.push(fileRecord);

          results.push({
            filename: file.originalname,
            storedAs: fileKey,
            success: false,
            error: `Ingestion failed: ${ingestError.message}`,
            s3Url: s3Url,
            message: `File uploaded to S3 but ingestion failed`,
          });

          console.log(
            `⚠️ File ${file.originalname} uploaded to S3 but ingestion failed`
          );
        }
      } catch (error) {
        console.error(`❌ Failed to process ${file.originalname}:`, error);

        results.push({
          filename: file.originalname,
          success: false,
          error: error.message,
          message: `Failed to process file: ${error.message}`,
        });
      }
    }

    // Update bot with file records in MongoDB
    if (fileRecords.length > 0) {
      try {
        const updatedBot = await updateBotFiles(
          botId,
          req.user.userId,
          fileRecords
        );

        if (updatedBot) {
          console.log(
            `✅ Updated bot ${botId} with ${fileRecords.length} S3 files in MongoDB:`,
            fileRecords.map((f) => ({
              filename: f.filename,
              s3Key: f.s3Key,
            }))
          );
        } else {
          console.error(
            `❌ Bot ${botId} not found for user ${req.user.userId} in MongoDB`
          );

          // Add warning to response
          results.push({
            warning: `Bot ${botId} not found in database - files uploaded to S3 but not linked to bot`,
          });
        }
      } catch (botError) {
        console.error(
          "❌ Failed to update bot with S3 file records in MongoDB:",
          botError
        );

        // Add error to response but don't fail the entire request
        results.push({
          warning: `Files uploaded to S3 but failed to update bot records: ${botError.message}`,
        });
      }
    }

    // Calculate summary statistics
    const successfulUploads = results.filter((r) => r.success).length;
    const failedUploads = results.filter(
      (r) => !r.success && !r.warning
    ).length;
    const totalChunks = results.reduce(
      (sum, file) => sum + (file.chunks || 0),
      0
    );

    // 🎯 NEW: Add limit info to summary
    const limitedFiles = results.filter(
      (r) => r.limit_info && r.limit_info.chunks_truncated > 0
    ).length;

    res.json({
      ok: true,
      files: results,
      botId: botId,
      summary: {
        totalFiles: req.files.length,
        successfulUploads,
        failedUploads,
        totalChunks,
        totalProcessed: fileRecords.length,
        maxChunksPerBot, // 🎯 NEW: Show user's limit
        limitedFiles, // 🎯 NEW: Show how many files were limited
      },
      message: `Processed ${req.files.length} files (${successfulUploads} successful, ${failedUploads} failed)`,
    });
  } catch (error) {
    console.error("❌ Upload processing error:", error);

    // Enhanced error response
    res.status(500).json({
      ok: false,
      error: "upload_processing_error",
      message: error.message || "Failed to process uploaded files",
      details: {
        processedFiles,
        processingStarted,
      },
    });
  }
};

// Error handler middleware
export const handleUploadErrors = (error, req, res, next) => {
  console.error("Upload error middleware:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        ok: false,
        error: "file_too_large",
        message: "File size too large (max 25MB)",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        ok: false,
        error: "too_many_files",
        message: "Too many files uploaded (max 10 files)",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        ok: false,
        error: "unexpected_file_field",
        message: "Unexpected file field name",
      });
    }

    // Generic multer error
    return res.status(400).json({
      ok: false,
      error: "upload_error",
      message: `Upload failed: ${error.message}`,
    });
  }

  // Handle custom file filter errors
  if (error.message === "Unsupported file type") {
    return res.status(400).json({
      ok: false,
      error: "unsupported_file_type",
      message:
        "File type not supported. Allowed types: PDF, Word documents, text files, markdown, CSV",
    });
  }

  // Pass to default error handler
  next(error);
};

// 🎯 UPDATED: Additional utility function for single file processing
export const processSingleFile = async (
  file,
  botId,
  userId,
  tenantId = null,
  userRole = null,
  maxChunksPerBot = 100 // 🎯 NEW: Default chunk limit
) => {
  try {
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
        uploadedBy: userId || "unknown",
        botId: botId,
      },
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct S3 URL
    const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${fileKey}`;

    console.log(`✅ File uploaded to S3: ${file.originalname} -> ${s3Url}`);

    // 🎯 UPDATED: Ingest with chunk limit
    const ingestResult = await pythonService.ingestFiles(
      botId,
      [s3Url],
      userId,
      tenantId,
      userRole,
      maxChunksPerBot // 🎯 NEW: Pass chunk limit
    );

    // Create file record
    const fileRecord = {
      filename: file.originalname,
      storedAs: fileKey,
      size: file.size,
      mimetype: file.mimetype,
      uploadedBy: userId,
      s3Url: s3Url,
      s3Key: fileKey,
      uploadedAt: new Date().toISOString(),
    };

    return {
      success: true,
      fileRecord,
      chunks: ingestResult.chunks_added || 0,
      s3Url,
      message: `Successfully processed ${file.originalname}`,
      limit_info: ingestResult.limit_info || null, // 🎯 NEW: Include limit info
    };
  } catch (error) {
    console.error(
      `❌ Failed to process single file ${file.originalname}:`,
      error
    );

    return {
      success: false,
      error: error.message,
      message: `Failed to process ${file.originalname}`,
    };
  }
};

// Health check for upload service
export const healthCheck = async (req, res) => {
  try {
    // Check S3 connectivity
    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      MaxKeys: 1,
    };

    // Check Python service health
    const pythonHealth = await pythonService.healthCheck();

    res.json({
      ok: true,
      services: {
        s3: {
          status: "connected",
          bucket: process.env.AWS_BUCKET_NAME,
        },
        pythonService: pythonHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(503).json({
      ok: false,
      error: "service_unavailable",
      message: "One or more services are unavailable",
      details: {
        s3: error.message.includes("S3") ? "unavailable" : "unknown",
        pythonService: "unavailable",
      },
    });
  }
};
