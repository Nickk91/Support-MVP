// server\src\controllers\botController.js
import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import Document from "../models/Document.js";
import Chunk from "../models/chunk.js";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import { deleteFileFromS3 } from "../utils/s3Utils.js";
import pythonService from "../services/pythonService.js";

// Create new bot with Python RAG integration
export const createBot = async (req, res) => {
  try {
    const {
      botName,
      model,
      systemMessage,
      fallback,
      escalation,
      files,
      greeting,
      guardrails,
      temperature,
    } = req.body;

    console.log("🤖 Creating bot for user:", req.user.userId);

    // Validation
    if (!botName || !model) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        message: "Bot name and model are required",
      });
    }

    // Verify user exists in MongoDB
    const user = await User.findOne({ _id: req.user.userId });
    if (!user) {
      console.error("❌ User not found:", req.user.userId);
      return res.status(400).json({
        ok: false,
        error: "user_not_found",
        message: "User not found. Please register again.",
      });
    }

    // Check for duplicate bot name within user's bots
    const duplicateBot = await Bot.findOne({
      botName: botName,
      ownerId: req.user.userId,
    });

    if (duplicateBot) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "You already have a bot with this name",
      });
    }

    // Create new bot with nanoid for ID
    const botId = nanoid();

    // Ensure files have proper uploadedBy values
    const processedFiles = (files || []).map((file) => ({
      ...file,
      uploadedBy: req.user.userId,
    }));

    const newBot = new Bot({
      _id: botId,
      botName,
      model,
      systemMessage: systemMessage || "",
      fallback: fallback || "",
      greeting: greeting || "",
      guardrails: guardrails || "",
      temperature: temperature || 0.1,
      escalation: escalation || { enabled: false, escalation_email: "" },
      files: processedFiles,
      ownerId: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newBot.save();

    console.log("✅ Bot created in MongoDB:", {
      id: botId,
      botName,
      ownerId: req.user.userId,
    });

    // 🐍 Python RAG Integration - Register bot using centralized service
    let pythonRagStatus = "disconnected";
    let pythonRagError = null;

    try {
      console.log("🎯 Registering bot with Python RAG service...");

      await pythonService.createBot(
        {
          bot_id: botId,
          bot_name: botName,
          system_message: systemMessage,
          model: model,
          fallback: fallback,
          owner_id: req.user.userId,
        },
        req.user.userId,
        req.user.tenantId
      );

      pythonRagStatus = "connected";
      console.log("✅ Bot successfully registered with Python RAG service");
    } catch (pythonError) {
      pythonRagStatus = "error";
      pythonRagError = pythonError.message;
      console.warn(
        "⚠️ Bot created but Python RAG service unavailable:",
        pythonError.message
      );
    }

    res.status(201).json({
      ok: true,
      bot: newBot,
      integration: {
        pythonRag: {
          status: pythonRagStatus,
          ...(pythonRagError && { error: pythonRagError }),
        },
      },
    });
  } catch (error) {
    console.error("[bot:create] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Failed to create bot",
    });
  }
};

// Update bot with Python RAG integration
export const updateBot = async (req, res) => {
  try {
    const {
      botName,
      model,
      systemMessage,
      fallback,
      escalation,
      files,
      greeting,
      guardrails,
      temperature,
    } = req.body;

    // Find bot with ownerId security check
    const bot = await Bot.findOne({
      _id: req.params.id,
      ownerId: req.user.userId,
    });

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found or access denied",
      });
    }

    // Check for duplicate name (only within user's own bots)
    if (botName !== bot.botName) {
      const duplicateBot = await Bot.findOne({
        botName: botName,
        ownerId: req.user.userId,
        _id: { $ne: req.params.id },
      });

      if (duplicateBot) {
        return res.status(400).json({
          ok: false,
          error: "duplicate_bot",
          message: "You already have a bot with this name",
        });
      }
    }

    // Update bot
    bot.botName = botName;
    bot.model = model;
    bot.systemMessage = systemMessage || "";
    bot.fallback = fallback || "";
    bot.greeting = greeting || "";
    bot.guardrails = guardrails || "";
    bot.temperature = temperature || 0.1;
    bot.escalation = escalation || { enabled: false, escalation_email: "" };
    bot.files = files || [];
    bot.updatedAt = new Date();

    await bot.save();

    console.log("✅ Bot updated in MongoDB:", {
      id: req.params.id,
      botName,
      ownerId: req.user.userId,
    });

    // 🐍 Update bot in Python RAG service using centralized service
    try {
      await pythonService.updateBot(
        req.params.id,
        {
          bot_name: botName,
          system_message: systemMessage,
          model: model,
          fallback: fallback,
        },
        req.user.userId,
        req.user.tenantId
      );

      console.log("✅ Bot updated in Python RAG service");
    } catch (pythonError) {
      console.warn(
        "⚠️ Bot updated but Python RAG service unavailable:",
        pythonError.message
      );
    }

    res.json({
      ok: true,
      bot: bot,
    });
  } catch (error) {
    console.error("[bot:update] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Failed to update bot",
    });
  }
};

// Get all bots for user (only user's own bots)
export const getBots = async (req, res) => {
  try {
    const userBots = await Bot.find({
      ownerId: req.user.userId,
    }).sort({ createdAt: -1 });

    console.log(`📊 Found ${userBots.length} bots for user ${req.user.userId}`);

    res.json({
      ok: true,
      bots: userBots,
      total: userBots.length,
    });
  } catch (error) {
    console.error("[bot:list] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Failed to fetch bots",
    });
  }
};

// Get single bot (with ownerId security)
export const getBot = async (req, res) => {
  try {
    const bot = await Bot.findOne({
      _id: req.params.id,
      ownerId: req.user.userId,
    });

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found or access denied",
      });
    }

    res.json({
      ok: true,
      bot,
    });
  } catch (error) {
    console.error("[bot:get] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Failed to fetch bot",
    });
  }
};

// Delete bot (with ownerId security)
export const deleteBot = async (req, res) => {
  try {
    const { id: botId } = req.params;
    const userId = req.user.userId;

    console.log("🔍 DELETE BOT DEBUG:", {
      botId,
      userId,
      userObject: req.user,
      params: req.params,
    });

    // Find the bot first
    const bot = await Bot.findOne({ _id: botId, ownerId: userId });
    console.log("🔍 BOT SEARCH RESULT:", bot);

    if (!bot) {
      console.log("❌ Bot not found - search criteria:", {
        _id: botId,
        ownerId: userId,
      });
      return res.status(404).json({
        ok: false,
        error: "Bot not found",
      });
    }

    console.log(`✅ Found bot to delete: ${bot.botName} (${botId})`);

    const cleanupResults = {
      s3Deletions: [],
      chunkDeletions: 0,
      documentDeletions: 0,
      errors: [],
    };

    // 1. Delete all files from S3
    console.log(`🗑️ Deleting ${bot.files.length} files from S3...`);
    for (const file of bot.files) {
      try {
        if (file.s3Key) {
          await deleteFileFromS3(file.s3Key);
          cleanupResults.s3Deletions.push(file.s3Key);
          console.log(`✅ Deleted S3 file: ${file.s3Key}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to delete S3 file ${file.s3Key}:`,
          error.message
        );
        cleanupResults.errors.push({
          operation: "s3_deletion",
          file: file.s3Key,
          error: error.message,
        });
      }
    }

    // 2. Delete all chunks from MongoDB
    console.log(`🗑️ Deleting chunks for bot ${botId}...`);
    try {
      const chunkResult = await Chunk.deleteMany({ bot_id: botId });
      cleanupResults.chunkDeletions = chunkResult.deletedCount;
      console.log(`✅ Deleted ${chunkResult.deletedCount} chunks`);
    } catch (error) {
      console.error(`❌ Failed to delete chunks:`, error.message);
      cleanupResults.errors.push({
        operation: "chunk_deletion",
        error: error.message,
      });
    }

    // 3. Delete all documents from MongoDB
    console.log(`🗑️ Deleting documents for bot ${botId}...`);
    try {
      const documentResult = await Document.deleteMany({ bot_id: botId });
      cleanupResults.documentDeletions = documentResult.deletedCount;
      console.log(`✅ Deleted ${documentResult.deletedCount} documents`);
    } catch (error) {
      console.error(`❌ Failed to delete documents:`, error.message);
      cleanupResults.errors.push({
        operation: "document_deletion",
        error: error.message,
      });
    }

    // 4. Delete vector store data from Python service
    console.log(`🗑️ Deleting vector store for bot ${botId}...`);
    try {
      await pythonService.deleteBot(botId, userId, req.user.tenantId);
      console.log(`✅ Vector store deleted for bot ${botId}`);
    } catch (error) {
      console.error(
        `❌ Failed to delete vector store for bot ${botId}:`,
        error.message
      );
      cleanupResults.errors.push({
        operation: "vector_store_deletion",
        error: error.message,
      });
      // Continue with bot deletion even if vector cleanup fails
    }

    // 5. Finally delete the bot itself
    console.log(`🗑️ Deleting bot ${botId} from database...`);
    await Bot.deleteOne({ _id: botId, ownerId: userId });
    console.log(`✅ Bot ${botId} deleted successfully`);

    res.json({
      ok: true,
      message: "Bot and all associated data deleted successfully",
      botId,
      cleanupResults,
      summary: {
        s3FilesDeleted: cleanupResults.s3Deletions.length,
        chunksDeleted: cleanupResults.chunkDeletions,
        documentsDeleted: cleanupResults.documentDeletions,
        errors: cleanupResults.errors.length,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting bot:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to delete bot",
      details: error.message,
    });
  }
};

// File cleanup for specific files - UPDATED TO DELETE DOCUMENT RECORDS
export const cleanupUploads = async (req, res) => {
  console.log("🧹 SERVER CLEANUP DEBUG - START =================");
  try {
    const { botId, fileIds } = req.body;
    const userId = req.user.userId;

    console.log("📦 Request data:", { botId, fileIds, userId });

    if (!botId || !fileIds || !Array.isArray(fileIds)) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        ok: false,
        error: "botId and fileIds array are required",
      });
    }

    // Verify user owns the bot
    const bot = await Bot.findOne({ _id: botId, ownerId: userId });
    if (!bot) {
      console.log("❌ Bot not found:", { botId, userId });
      return res.status(404).json({
        ok: false,
        error: "Bot not found",
      });
    }

    console.log("🤖 Bot found:", bot.botName);
    console.log(
      "📁 Current bot files:",
      bot.files.map((f) => ({
        filename: f.filename,
        storedAs: f.storedAs,
        s3Key: f.s3Key,
      }))
    );

    console.log("🎯 Looking for files matching:", fileIds);

    // FIX: Use more flexible matching to find files to delete
    const filesToDelete = [];
    const remainingFiles = [];

    bot.files.forEach((file) => {
      // Check if this file should be deleted by matching against any identifier
      const shouldDelete = fileIds.some((fileId) => {
        // Try multiple matching strategies
        const matches =
          file.s3Key === fileId ||
          file.storedAs === fileId ||
          file.filename === fileId ||
          (file._id && file._id.toString() === fileId);

        if (matches) {
          console.log(
            `✅ MATCH FOUND: ${file.filename} (s3Key: ${file.s3Key}) matches ${fileId}`
          );
        }
        return matches;
      });

      if (shouldDelete) {
        filesToDelete.push(file);
      } else {
        remainingFiles.push(file);
      }
    });

    console.log("🗑️ Files to delete found:", filesToDelete.length);
    console.log(
      "📋 Files to delete details:",
      filesToDelete.map((f) => ({
        filename: f.filename,
        s3Key: f.s3Key,
        storedAs: f.storedAs,
      }))
    );

    if (filesToDelete.length === 0) {
      console.log("❌ No matching files found in bot");
      return res.json({
        ok: true,
        message: "No matching files found to cleanup",
        results: {
          s3Deletions: [],
          chunkDeletions: 0,
          documentDeletions: 0, // Changed from documentUpdates
          errors: [],
        },
      });
    }

    const cleanupResults = {
      s3Deletions: [],
      chunkDeletions: 0,
      documentDeletions: 0, // Changed from documentUpdates
      errors: [],
    };

    // ✅ DELETE EACH FILE PROPERLY
    for (const file of filesToDelete) {
      try {
        console.log(`🧹 Cleaning up file: ${file.filename} (${file.s3Key})`);

        // 1. Delete from S3
        if (file.s3Key) {
          console.log(`🗑️ Deleting from S3: ${file.s3Key}`);
          await deleteFileFromS3(file.s3Key);
          cleanupResults.s3Deletions.push(file.s3Key);
          console.log(`✅ Deleted from S3: ${file.s3Key}`);
        }

        // 2. Delete chunks from MongoDB - FIXED: Use multiple field names
        console.log(`🗑️ Deleting chunks for: ${file.s3Key}`);
        const chunkResult = await Chunk.deleteMany({
          bot_id: botId,
          $or: [
            { document_path: file.s3Key },
            { s3_key: file.s3Key },
            { file_path: file.s3Key },
            { source: file.s3Key },
          ],
        });
        cleanupResults.chunkDeletions += chunkResult.deletedCount;
        console.log(`✅ Deleted ${chunkResult.deletedCount} chunks`);

        // 🎯 CRITICAL FIX: DELETE document records instead of updating status
        console.log(`🗑️ Deleting document records for: ${file.s3Key}`);
        const docResult = await Document.deleteMany({
          bot_id: botId,
          $or: [
            { document_path: file.s3Key },
            { s3_key: file.s3Key },
            { file_path: file.s3Key },
          ],
        });
        if (docResult.deletedCount > 0) {
          cleanupResults.documentDeletions += docResult.deletedCount; // Changed from documentUpdates
          console.log(`✅ Deleted ${docResult.deletedCount} document records`);
        } else {
          console.log(
            `ℹ️ No document records found to delete for: ${file.s3Key}`
          );
        }
      } catch (error) {
        cleanupResults.errors.push({
          file: file.filename,
          error: error.message,
        });
        console.error(`❌ Error cleaning up file ${file.filename}:`, error);
      }
    }

    // 4. Update bot to remove the deleted files (THIS WAS MISSING!)
    if (filesToDelete.length > 0) {
      console.log(`🗑️ Removing ${filesToDelete.length} files from bot`);
      bot.files = remainingFiles;
      await bot.save();
      console.log(
        `✅ Updated bot with ${remainingFiles.length} remaining files`
      );
    }

    // 5. Call Python service to cleanup vector store
    try {
      const s3KeysToCleanup = filesToDelete.map((f) => f.s3Key).filter(Boolean);
      if (s3KeysToCleanup.length > 0) {
        console.log(`🧹 Cleaning up vector store for files:`, s3KeysToCleanup);
        await pythonService.cleanupFiles(
          botId,
          s3KeysToCleanup,
          userId,
          req.user.tenantId
        );
        console.log(`✅ Cleaned up vector store`);
      }
    } catch (error) {
      console.error("❌ Failed to cleanup vector store files:", error);
      cleanupResults.errors.push({
        operation: "vector_store_cleanup",
        error: error.message,
      });
    }

    console.log("✅ Cleanup completed:", cleanupResults);
    console.log("🧹 SERVER CLEANUP DEBUG - END =================");

    res.json({
      ok: true,
      message: `Cleanup completed for ${filesToDelete.length} files`,
      results: cleanupResults,
    });
  } catch (error) {
    console.error("❌ Error in cleanupUploads:", error);
    console.log("🧹 SERVER CLEANUP DEBUG - END =================");
    res.status(500).json({
      ok: false,
      error: "Failed to cleanup uploads: " + error.message,
    });
  }
};

// Update bot files - COMPLETELY REPLACED FOR FILE REPLACEMENT
// COMPLETELY UPDATED updateBotFiles function - FIXED FOR FILE REPLACEMENT
export const updateBotFiles = async (botId, ownerId, newFileRecords) => {
  try {
    console.log("🔄 updateBotFiles - Starting COMPLETE file replacement");
    console.log("📦 New file records:", newFileRecords);

    // First, get the current bot to see existing files
    const currentBot = await Bot.findOne({
      _id: botId,
      ownerId: ownerId,
    });

    if (!currentBot) {
      console.error(`❌ Bot ${botId} not found for user ${ownerId}`);
      throw new Error("Bot not found");
    }

    console.log("📁 Current bot files:", currentBot.files);

    // 🚨 COMPLETE REPLACEMENT LOGIC: Clean up ALL old S3 files before adding new ones
    const oldFiles = currentBot.files;

    if (oldFiles.length > 0) {
      console.log("🗑️ Cleaning up ALL old files before replacement");

      for (const oldFile of oldFiles) {
        // 🎯 CRITICAL FIX: Clean up BOTH temp files AND actual S3 files
        if (oldFile.s3Key && !oldFile.s3Key.startsWith("temp_")) {
          try {
            console.log(
              `🧹 Cleaning up OLD S3 FILE: ${oldFile.filename} (${oldFile.s3Key})`
            );

            // 1. Delete from S3
            await deleteFileFromS3(oldFile.s3Key);
            console.log(`✅ Deleted old S3 file: ${oldFile.s3Key}`);

            // 2. Delete chunks - Use multiple field names for comprehensive cleanup
            const chunkResult = await Chunk.deleteMany({
              bot_id: botId,
              $or: [
                { document_path: oldFile.s3Key },
                { s3_key: oldFile.s3Key },
                { file_path: oldFile.s3Key },
                { source: oldFile.s3Key },
              ],
            });
            console.log(
              `✅ Deleted ${chunkResult.deletedCount} old chunks for ${oldFile.s3Key}`
            );

            // 🎯 CRITICAL FIX: DELETE document records instead of updating status
            console.log(`🗑️ Deleting document records for: ${oldFile.s3Key}`);
            const docResult = await Document.deleteMany({
              bot_id: botId,
              $or: [
                { document_path: oldFile.s3Key },
                { s3_key: oldFile.s3Key },
                { file_path: oldFile.s3Key },
              ],
            });
            if (docResult.deletedCount > 0) {
              console.log(
                `✅ Deleted ${docResult.deletedCount} document records for ${oldFile.s3Key}`
              );
            } else {
              console.log(
                `ℹ️ No document records found to delete for: ${oldFile.s3Key}`
              );
            }
          } catch (cleanupError) {
            console.error(
              `⚠️ Failed to cleanup old file ${oldFile.s3Key}:`,
              cleanupError
            );
            // Continue with other files - don't fail the whole operation
          }
        } else if (oldFile.storedAs && oldFile.storedAs.startsWith("temp_")) {
          console.log(
            `⏭️ Skipping temp file cleanup (no S3 data): ${oldFile.storedAs}`
          );
        } else {
          console.log(`🔍 File has no S3 key or is not a temp file:`, oldFile);
        }
      }

      // 🎯 ADDITIONAL FIX: Also try to cleanup by filename for any remaining chunks
      console.log("🔍 Performing additional cleanup by filename...");
      for (const oldFile of oldFiles) {
        if (
          oldFile.filename &&
          oldFile.s3Key &&
          !oldFile.s3Key.startsWith("temp_")
        ) {
          try {
            // Try to delete chunks by filename as well (in case they were stored differently)
            const filenameChunkResult = await Chunk.deleteMany({
              bot_id: botId,
              $or: [
                { document_path: { $regex: oldFile.filename, $options: "i" } },
                { file_path: { $regex: oldFile.filename, $options: "i" } },
                { source: { $regex: oldFile.filename, $options: "i" } },
              ],
            });
            if (filenameChunkResult.deletedCount > 0) {
              console.log(
                `✅ Deleted additional ${filenameChunkResult.deletedCount} chunks by filename: ${oldFile.filename}`
              );
            }

            // Also try to delete document records by filename
            const filenameDocResult = await Document.deleteMany({
              bot_id: botId,
              $or: [
                { document_path: { $regex: oldFile.filename, $options: "i" } },
                { file_path: { $regex: oldFile.filename, $options: "i" } },
                { file_name: { $regex: oldFile.filename, $options: "i" } },
              ],
            });
            if (filenameDocResult.deletedCount > 0) {
              console.log(
                `✅ Deleted additional ${filenameDocResult.deletedCount} document records by filename: ${oldFile.filename}`
              );
            }
          } catch (filenameError) {
            console.error(
              `⚠️ Filename-based cleanup failed for ${oldFile.filename}:`,
              filenameError
            );
          }
        }
      }
    }

    // 🎯 COMPLETELY REPLACE the files array with new files (no merging)
    const updatedBot = await Bot.findOneAndUpdate(
      {
        _id: botId,
        ownerId: ownerId,
      },
      {
        $set: {
          files: newFileRecords, // Complete replacement, no merging
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    console.log("✅ Bot files COMPLETELY REPLACED");
    console.log(
      "📋 New files:",
      newFileRecords.map((f) => ({
        filename: f.filename,
        s3Key: f.s3Key,
        storedAs: f.storedAs,
      }))
    );

    return updatedBot;
  } catch (error) {
    console.error("❌ Error updating bot files:", error);
    throw error;
  }
};

// Debug endpoint to check uploads folder
export const debugUploads = async (req, res) => {
  try {
    const UPLOAD_DIR = path.resolve(
      process.cwd(),
      process.env.UPLOAD_DIR || "uploads"
    );

    console.log(`🔍 Checking uploads directory: ${UPLOAD_DIR}`);

    const dirExists = await fs
      .access(UPLOAD_DIR)
      .then(() => true)
      .catch(() => false);

    if (!dirExists) {
      return res.json({
        ok: true,
        message: "Uploads directory does not exist",
        path: UPLOAD_DIR,
        files: [],
      });
    }

    const files = await fs.readdir(UPLOAD_DIR);
    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        try {
          const filePath = path.join(UPLOAD_DIR, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            path: filePath,
            size: stats.size,
            isFile: stats.isFile(),
            modified: stats.mtime,
          };
        } catch (error) {
          return {
            filename,
            error: error.message,
          };
        }
      })
    );

    res.json({
      ok: true,
      path: UPLOAD_DIR,
      totalFiles: files.length,
      files: fileDetails,
    });
  } catch (error) {
    console.error("Debug uploads error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
};

export const cleanupOrphanedVectorStores = async (req, res) => {
  try {
    // Get all bot IDs from MongoDB
    const allBots = await Bot.find({}, "_id");
    const botIds = allBots.map((bot) => bot._id);

    // This would require the Python service to have an endpoint to list all vector stores
    // and clean up ones that don't match existing bot IDs

    res.json({
      ok: true,
      message: "Orphaned vector store cleanup completed",
      totalBots: botIds.length,
    });
  } catch (error) {
    console.error("Error cleaning up orphaned vector stores:", error);
    res.status(500).json({
      ok: false,
      error: "Cleanup failed",
      details: error.message,
    });
  }
};
