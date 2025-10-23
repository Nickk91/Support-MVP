import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";

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
      uploadedBy: req.user.userId, // Ensure this is the actual user ID, not "current-user"
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
      files: processedFiles, // Use processed files with proper uploadedBy
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

    // 🐍 Python RAG Integration - Register bot
    let pythonRagStatus = "disconnected";
    let pythonRagError = null;

    try {
      console.log("🎯 Registering bot with Python RAG service...");

      const pythonResponse = await fetch("http://localhost:8000/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": req.user.userId,
        },
        body: JSON.stringify({
          bot_id: botId,
          bot_name: botName,
          system_message: systemMessage,
          model: model,
          fallback: fallback,
          owner_id: req.user.userId,
        }),
      });

      if (pythonResponse.ok) {
        const result = await pythonResponse.json();
        pythonRagStatus = "connected";
        console.log(
          "✅ Bot successfully registered with Python RAG service:",
          result.message
        );
      } else {
        const errorText = await pythonResponse.text();
        pythonRagStatus = "failed";
        pythonRagError = `Python service error: ${pythonResponse.status} - ${errorText}`;
        console.warn(
          "⚠️ Bot created but Python RAG registration failed:",
          errorText
        );
      }
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

    // 🐍 Update bot in Python RAG service
    try {
      const pythonResponse = await fetch(
        `http://localhost:8000/api/bots/${req.params.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": req.user.userId,
          },
          body: JSON.stringify({
            bot_name: botName,
            system_message: systemMessage,
            model: model,
            fallback: fallback,
          }),
        }
      );

      if (pythonResponse.ok) {
        const result = await pythonResponse.json();
        console.log("✅ Bot updated in Python RAG service:", result.message);
      } else {
        const errorText = await pythonResponse.text();
        console.warn("⚠️ Bot updated but Python RAG sync failed:", errorText);
      }
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
    // Find bots by ownerId for security
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

    // 🗂️ Delete uploaded files from server file system (if any local files exist)
    if (bot.files && bot.files.length > 0) {
      try {
        await deleteBotFiles(bot.files);
        console.log(`✅ Deleted ${bot.files.length} files for bot ${bot._id}`);
      } catch (fileError) {
        console.warn(
          `⚠️ File cleanup failed for bot ${bot._id}:`,
          fileError.message
        );
        // Continue with bot deletion even if file cleanup fails
      }
    }

    // Remove bot from MongoDB
    await Bot.deleteOne({ _id: req.params.id });

    console.log("🗑️ Bot deleted from MongoDB:", {
      id: req.params.id,
      botName: bot.botName,
      ownerId: req.user.userId,
      filesDeleted: bot.files?.length || 0,
    });

    // 🐍 Delete bot from Python RAG service
    try {
      const pythonResponse = await fetch(
        `http://localhost:8000/api/bots/${req.params.id}`,
        {
          method: "DELETE",
          headers: {
            "X-User-ID": req.user.userId,
          },
        }
      );

      if (pythonResponse.ok) {
        const result = await pythonResponse.json();
        console.log("✅ Bot deleted from Python RAG service:", result.message);
      } else {
        const errorText = await pythonResponse.text();
        console.warn(
          "⚠️ Bot deleted but Python RAG cleanup failed:",
          errorText
        );
      }
    } catch (pythonError) {
      console.warn(
        "⚠️ Bot deleted but Python RAG cleanup failed:",
        pythonError.message
      );
    }

    res.json({
      ok: true,
      message: "Bot deleted successfully",
      deletedBot: {
        id: bot._id,
        botName: bot.botName,
        filesDeleted: bot.files?.length || 0,
      },
    });
  } catch (error) {
    console.error("[bot:delete] error:", error);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: "Failed to delete bot",
    });
  }
};

// Helper function to delete physical files (for any remaining local files)
async function deleteBotFiles(files) {
  console.log(`🗑️ Starting file deletion for ${files.length} files...`);

  const deletePromises = files.map(async (file) => {
    try {
      // Files are stored in the uploads directory with the storedAs filename
      if (file.storedAs) {
        const UPLOAD_DIR = path.resolve(
          process.cwd(),
          process.env.UPLOAD_DIR || "uploads"
        );
        const filePath = path.join(UPLOAD_DIR, file.storedAs);

        console.log(`🔍 Attempting to delete file: ${filePath}`);

        // Check if file exists before trying to delete
        try {
          await fs.access(filePath);
          console.log(`📁 File exists, deleting: ${file.storedAs}`);
          await fs.unlink(filePath);
          console.log(`✅ Successfully deleted file: ${file.storedAs}`);
          return { success: true, file: file.storedAs };
        } catch (error) {
          if (error.code === "ENOENT") {
            console.log(
              `ℹ️ File already deleted or not found: ${file.storedAs}`
            );
            return { success: true, file: file.storedAs, alreadyGone: true };
          }
          throw error;
        }
      } else {
        console.warn(`⚠️ File record missing storedAs field:`, file);
        return {
          success: false,
          file: file.filename,
          error: "Missing storedAs field",
        };
      }
    } catch (error) {
      console.error(
        `❌ Failed to delete file ${file.storedAs}:`,
        error.message
      );
      return { success: false, file: file.storedAs, error: error.message };
    }
  });

  const results = await Promise.all(deletePromises);

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `📊 File deletion summary: ${successful} successful, ${failed} failed out of ${files.length} total`
  );

  return results;
}

// Update bot files (used by upload controller)
export const updateBotFiles = async (botId, ownerId, fileRecords) => {
  try {
    const bot = await Bot.findOneAndUpdate(
      {
        _id: botId,
        ownerId: ownerId,
      },
      {
        $set: {
          files: fileRecords,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    return bot;
  } catch (error) {
    console.error("Error updating bot files:", error);
    throw error;
  }
};

// Debug endpoint to check uploads folder (remove in production)
export const debugUploads = async (req, res) => {
  try {
    const UPLOAD_DIR = path.resolve(
      process.cwd(),
      process.env.UPLOAD_DIR || "uploads"
    );

    console.log(`🔍 Checking uploads directory: ${UPLOAD_DIR}`);

    // Check if directory exists
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

    // Read directory contents
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

export const cleanupUploads = async (req, res) => {
  try {
    const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
    const files = await fs.readdir(UPLOAD_DIR);

    console.log(`🧹 Cleaning up ${files.length} files from uploads folder`);

    const deletionResults = [];
    for (const filename of files) {
      try {
        const filePath = path.join(UPLOAD_DIR, filename);
        await fs.unlink(filePath);
        deletionResults.push({ filename, success: true });
        console.log(`✅ Deleted: ${filename}`);
      } catch (error) {
        deletionResults.push({
          filename,
          success: false,
          error: error.message,
        });
        console.log(`❌ Failed to delete: ${filename} - ${error.message}`);
      }
    }

    res.json({
      ok: true,
      message: `Cleaned up ${files.length} files`,
      results: deletionResults,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
