// server\src\controllers\botController.js
import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import Document from "../models/Document.js";
import { Chunk } from "../models/chunk.js";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import { deleteFileFromS3 } from "../utils/s3Utils.js";
import pythonService from "../services/pythonService.js";
import { composeBotConfig } from "../utils/botTemplateComposer.js";

// 🎯 CREATE BOT - UPDATED TO USE USER'S COMPANY
export const createBot = async (req, res) => {
  try {
    const {
      botName,
      model,
      companyReference,
      personalityType = "professional",
      safetyLevel = "standard",
      temperature = 0.7,
      systemMessage,
      guardrails,
      greeting,
      fallback,
      escalation,
      files = [],
    } = req.body;

    console.log("🤖 Creating bot with user's company:", {
      botName,
      companyReference,
      personalityType,
      safetyLevel,
      userId: req.user.userId,
    });

    // 🚨 STRICT VALIDATION
    if (!botName || !model) {
      return res.status(400).json({
        ok: false,
        error: "missing_required_fields",
        message: "Bot name and model are required",
        required: ["botName", "model"],
      });
    }

    // Verify user exists
    const user = await User.findOne({ _id: req.user.userId });
    if (!user) {
      console.error("❌ User not found:", req.user.userId);
      return res.status(400).json({
        ok: false,
        error: "user_not_found",
        message: "User not found. Please register again.",
      });
    }

    // 🎯 Get available brands and validate
    const availableBrands = getAvailableBrands(user);
    const selectedBrand = companyReference || user.companyName;

    if (!availableBrands.includes(selectedBrand)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_company_reference",
        message:
          "Invalid company reference. Please select from your available brands.",
      });
    }

    // Check for duplicate bot name
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

    // 🎯 REMOVED: const botId = nanoid();
    // MongoDB will now auto-generate a valid _id

    // Process files
    const processedFiles = (files || []).map((file) => ({
      ...file,
      uploadedBy: req.user.userId,
    }));

    // Compose bot config
    const formData = {
      botName,
      model,
      temperature,
      personalityType,
      safetyLevel,
      companyReference: selectedBrand,
      systemMessage,
      guardrails,
      greeting,
      fallback,
      escalation: escalation || { enabled: false, escalation_email: "" },
      files: processedFiles,
    };

    const botConfig = composeBotConfig(formData);

    // 🎯 CREATE BOT WITHOUT MANUAL _id
    const newBot = new Bot({
      // 🎯 REMOVED: _id: botId, - Let MongoDB handle ID generation
      ...botConfig,
      brandContext: {
        primaryCompany: user.companyName,
        verifiedBrands:
          user.brandSettings?.verifiedBrands?.map((b) => b.name) || [],
        customBrands:
          user.brandSettings?.customBrands?.map((b) => b.name) || [],
        tier: user.brandSettings?.tier || "basic",
        verificationStatus: "unverified",
      },
      currentBrand: {
        type: selectedBrand === user.companyName ? "primary" : "verified",
        reference: selectedBrand,
      },
      ownerId: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newBot.save();

    console.log("✅ Bot created with MongoDB _id:", {
      id: newBot._id, // Use the auto-generated ID
      botName,
      companyReference: selectedBrand,
      personalityType: botConfig.personalityType,
      safetyLevel: botConfig.safetyLevel,
      ownerId: req.user.userId,
    });

    // 🐍 Python RAG Integration - Use newBot._id instead of botId
    let pythonRagStatus = "disconnected";
    let pythonRagError = null;

    try {
      console.log("🎯 Registering bot with Python RAG service...");

      await pythonService.createBot(
        {
          bot_id: newBot._id, // Use the MongoDB-generated _id
          bot_name: botName,
          system_message: botConfig.systemMessage,
          model: model,
          fallback: botConfig.fallback,
          owner_id: req.user.userId,
        },
        req.user.userId
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

// 🎯 UPDATE BOT - UPDATED TO USE USER'S COMPANY
export const updateBot = async (req, res) => {
  try {
    const {
      botName,
      model,
      companyReference,
      personalityType,
      safetyLevel,
      temperature,
      systemMessage,
      guardrails,
      greeting,
      fallback,
      escalation,
      files,
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

    // 🎯 NEW: Get user to validate companyReference
    const user = await User.findOne({ _id: req.user.userId });
    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "user_not_found",
        message: "User not found. Please register again.",
      });
    }

    // 🎯 NEW: Validate companyReference if provided
    let selectedBrand = companyReference || bot.companyReference;
    if (companyReference) {
      const availableBrands = getAvailableBrands(user);
      if (!availableBrands.includes(companyReference)) {
        return res.status(400).json({
          ok: false,
          error: "invalid_company_reference",
          message:
            "Invalid company reference. Please select from your available brands.",
        });
      }
      selectedBrand = companyReference;
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

    // 🎯 COMPOSE UPDATED CONFIG USING TEMPLATES
    const formData = {
      botName,
      model,
      temperature: temperature ?? bot.temperature,
      personalityType: personalityType ?? bot.personalityType,
      safetyLevel: safetyLevel ?? bot.safetyLevel,
      companyReference: selectedBrand, // Use validated brand
      systemMessage: systemMessage ?? bot.systemMessage,
      guardrails: guardrails ?? bot.guardrails,
      greeting: greeting ?? bot.greeting,
      fallback: fallback ?? bot.fallback,
      escalation: escalation ?? bot.escalation,
      files: files ?? bot.files,
    };

    const botConfig = composeBotConfig(formData);

    // 🎯 UPDATE BOT WITH COMPOSED CONFIGURATION AND USER'S BRAND STRUCTURE
    Object.assign(bot, botConfig);

    // 🎯 UPDATED: Update brand context with user's current structure
    bot.brandContext = {
      primaryCompany: user.companyName,
      verifiedBrands:
        user.brandSettings?.verifiedBrands?.map((b) => b.name) || [],
      customBrands: user.brandSettings?.customBrands?.map((b) => b.name) || [],
      tier: user.brandSettings?.tier || "basic",
      verificationStatus: bot.brandContext?.verificationStatus || "unverified",
    };

    bot.currentBrand = {
      type: selectedBrand === user.companyName ? "primary" : "verified",
      reference: selectedBrand,
    };

    bot.updatedAt = new Date();

    await bot.save();

    console.log("✅ Bot updated with user's company:", {
      id: req.params.id,
      botName,
      companyReference: selectedBrand,
      personalityType: botConfig.personalityType,
      safetyLevel: botConfig.safetyLevel,
      ownerId: req.user.userId,
    });

    // 🐍 Update bot in Python RAG service using centralized service
    try {
      const pythonResult = await pythonService.updateBot(
        req.params.id,
        {
          bot_name: botName,
          system_message: botConfig.systemMessage,
          model: model,
          fallback: botConfig.fallback,
          temperature: botConfig.temperature,
          company_reference: botConfig.companyReference,
          personality_type: botConfig.personalityType,
          safety_level: botConfig.safetyLevel,
          guardrails: botConfig.guardrails,
          greeting: botConfig.greeting,
        },
        req.user.userId
      );

      console.log("✅ Bot updated in Python RAG service:", {
        bot_created: pythonResult.bot_created,
        fields_updated: pythonResult.fields_updated,
      });
    } catch (pythonError) {
      console.warn(
        "⚠️ Bot updated in MongoDB but Python RAG service had issues:",
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

// 🎯 HELPER FUNCTION: Get available brands for a user
function getAvailableBrands(user) {
  const brands = [user.companyName]; // Always include primary company

  // Add verified brands
  if (user.brandSettings?.verifiedBrands) {
    user.brandSettings.verifiedBrands
      .filter((brand) => brand.isActive)
      .forEach((brand) => brands.push(brand.name));
  }

  // Add custom brands
  if (user.brandSettings?.customBrands) {
    user.brandSettings.customBrands
      .filter((brand) => brand.isActive)
      .forEach((brand) => brands.push(brand.name));
  }

  return [...new Set(brands)]; // Remove duplicates
}

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

// 🎯 CLEANUP ALL LEGACY BOTS (One-time migration)
export const cleanupLegacyBots = async (req, res) => {
  try {
    console.log("🧹 CLEANING UP ALL LEGACY BOTS");

    // Delete all bots that don't have the new required fields
    const legacyBots = await Bot.find({
      $or: [
        { companyReference: { $exists: false } },
        { personalityType: { $exists: false } },
        { safetyLevel: { $exists: false } },
      ],
    });

    console.log(`🗑️ Found ${legacyBots.length} legacy bots to delete`);

    let deletedCount = 0;
    const deletionResults = [];

    for (const bot of legacyBots) {
      try {
        // Cleanup files from S3
        for (const file of bot.files) {
          if (file.s3Key) {
            try {
              await deleteFileFromS3(file.s3Key);
            } catch (error) {
              console.warn(
                `Failed to delete S3 file ${file.s3Key}:`,
                error.message
              );
            }
          }
        }

        // Cleanup database records
        await Chunk.deleteMany({ bot_id: bot._id });
        await Document.deleteMany({ bot_id: bot._id });

        // Delete bot
        await Bot.deleteOne({ _id: bot._id });

        deletedCount++;
        deletionResults.push({
          botId: bot._id,
          botName: bot.botName,
          status: "deleted",
        });

        console.log(`✅ Deleted legacy bot: ${bot.botName}`);
      } catch (error) {
        deletionResults.push({
          botId: bot._id,
          botName: bot.botName,
          status: "error",
          error: error.message,
        });
        console.error(`❌ Failed to delete legacy bot ${bot.botName}:`, error);
      }
    }

    res.json({
      ok: true,
      message: `Legacy cleanup completed. ${deletedCount} bots deleted.`,
      totalLegacyBots: legacyBots.length,
      deletedCount,
      results: deletionResults,
    });
  } catch (error) {
    console.error("❌ Legacy cleanup error:", error);
    res.status(500).json({
      ok: false,
      error: "legacy_cleanup_failed",
      message: "Failed to cleanup legacy bots",
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
      await pythonService.deleteBot(botId, userId);
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

// File cleanup for specific files
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
          documentDeletions: 0,
          errors: [],
        },
      });
    }

    const cleanupResults = {
      s3Deletions: [],
      chunkDeletions: 0,
      documentDeletions: 0,
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

        // 2. Delete chunks from MongoDB
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

        // 🎯 DELETE document records
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
          cleanupResults.documentDeletions += docResult.deletedCount;
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

    // 4. Update bot to remove the deleted files
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
        await pythonService.cleanupFiles(botId, s3KeysToCleanup, userId);
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
        if (oldFile.s3Key && !oldFile.s3Key.startsWith("temp_")) {
          try {
            console.log(
              `🧹 Cleaning up OLD S3 FILE: ${oldFile.filename} (${oldFile.s3Key})`
            );

            // 1. Delete from S3
            await deleteFileFromS3(oldFile.s3Key);
            console.log(`✅ Deleted old S3 file: ${oldFile.s3Key}`);

            // 2. Delete chunks
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

            // 🎯 DELETE document records
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
          }
        } else if (oldFile.storedAs && oldFile.storedAs.startsWith("temp_")) {
          console.log(
            `⏭️ Skipping temp file cleanup (no S3 data): ${oldFile.storedAs}`
          );
        } else {
          console.log(`🔍 File has no S3 key or is not a temp file:`, oldFile);
        }
      }

      // Additional cleanup by filename
      console.log("🔍 Performing additional cleanup by filename...");
      for (const oldFile of oldFiles) {
        if (
          oldFile.filename &&
          oldFile.s3Key &&
          !oldFile.s3Key.startsWith("temp_")
        ) {
          try {
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

    // 🎯 COMPLETELY REPLACE the files array with new files
    const updatedBot = await Bot.findOneAndUpdate(
      {
        _id: botId,
        ownerId: ownerId,
      },
      {
        $set: {
          files: newFileRecords,
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
