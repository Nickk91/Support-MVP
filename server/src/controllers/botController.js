// server/src/controllers/botController.js - UPDATED
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to JSON files
const BOTS_FILE = path.join(__dirname, "../../data/bots/bots.json");
const USERS_FILE = path.join(__dirname, "../../data/users/users.json");

// Helper functions
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { users: [], lastId: 0 };
  }
}

export async function readBots() {
  try {
    const data = await fs.readFile(BOTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { bots: [], lastId: 0 };
  }
}

export async function writeBots(botsData) {
  await fs.writeFile(BOTS_FILE, JSON.stringify(botsData, null, 2));
}

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
    console.log("🏢 Tenant:", req.user.tenantId);

    // Validation
    if (!botName || !model) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        message: "Bot name and model are required",
      });
    }

    // Read users data to verify user exists
    const usersData = await readUsers();
    const user = usersData.users.find((u) => u.id === req.user.userId);
    if (!user) {
      console.error("❌ User not found:", req.user.userId);
      return res.status(400).json({
        ok: false,
        error: "user_not_found",
        message: "User not found. Please register again.",
      });
    }

    // Read existing bots
    const botsData = await readBots();

    // Check for duplicate bot name within user's bots
    const duplicateBot = botsData.bots.find(
      (bot) =>
        bot.botName === botName &&
        bot.ownerId === req.user.userId &&
        bot.tenantId === req.user.tenantId
    );

    if (duplicateBot) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "You already have a bot with this name",
      });
    }

    // Create new bot
    const botId = (botsData.lastId + 1).toString();

    const newBot = {
      id: botId,
      botName,
      model,
      systemMessage: systemMessage || "",
      fallback: fallback || "",
      greeting: greeting || "",
      guardrails: guardrails || "",
      temperature: temperature || 0.7,
      escalation: escalation || { enabled: false, escalation_email: "" },
      files: files || [],
      tenantId: req.user.tenantId,
      ownerId: req.user.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add bot to data and update lastId
    botsData.bots.push(newBot);
    botsData.lastId = parseInt(botId);
    await writeBots(botsData);

    console.log("✅ Bot created in JSON:", {
      id: botId,
      botName,
      ownerId: req.user.userId,
      tenantId: req.user.tenantId,
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
          "X-Tenant-ID": req.user.tenantId,
        },
        body: JSON.stringify({
          bot_id: botId,
          bot_name: botName,
          system_message: systemMessage,
          model: model,
          fallback: fallback,
          tenant_id: req.user.tenantId,
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

    const botsData = await readBots();

    // ✅ Check both ownerId and tenantId for security
    const botIndex = botsData.bots.findIndex(
      (bot) =>
        bot.id === req.params.id &&
        bot.ownerId === req.user.userId &&
        bot.tenantId === req.user.tenantId
    );

    if (botIndex === -1) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found or access denied",
      });
    }

    // Check for duplicate name (only within user's own bots)
    const duplicateBot = botsData.bots.find(
      (bot) =>
        bot.botName === botName &&
        bot.ownerId === req.user.userId &&
        bot.tenantId === req.user.tenantId &&
        bot.id !== req.params.id
    );

    if (duplicateBot) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "You already have a bot with this name",
      });
    }

    // Update bot
    const updatedBot = {
      ...botsData.bots[botIndex],
      botName,
      model,
      systemMessage,
      fallback,
      greeting: greeting || "",
      guardrails: guardrails || "",
      temperature: temperature || 0.7,
      escalation,
      files,
      updatedAt: new Date().toISOString(),
    };

    botsData.bots[botIndex] = updatedBot;
    await writeBots(botsData);

    console.log("✅ Bot updated:", {
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
            "X-Tenant-ID": req.user.tenantId,
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
      bot: updatedBot,
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
    const botsData = await readBots();

    // ✅ Filter by both ownerId AND tenantId for security
    const userBots = botsData.bots.filter(
      (bot) =>
        bot.ownerId === req.user.userId && bot.tenantId === req.user.tenantId
    );

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
    const botsData = await readBots();

    // ✅ Check both ownerId and tenantId for security
    const bot = botsData.bots.find(
      (bot) =>
        bot.id === req.params.id &&
        bot.ownerId === req.user.userId &&
        bot.tenantId === req.user.tenantId
    );

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
    const botsData = await readBots();

    // ✅ Check both ownerId and tenantId for security
    const botIndex = botsData.bots.findIndex(
      (bot) =>
        bot.id === req.params.id &&
        bot.ownerId === req.user.userId &&
        bot.tenantId === req.user.tenantId
    );

    if (botIndex === -1) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found or access denied",
      });
    }

    const deletedBot = botsData.bots[botIndex];

    // 🗂️ Delete uploaded files from server file system
    if (deletedBot.files && deletedBot.files.length > 0) {
      try {
        await deleteBotFiles(deletedBot.files);
        console.log(
          `✅ Deleted ${deletedBot.files.length} files for bot ${deletedBot.id}`
        );
      } catch (fileError) {
        console.warn(
          `⚠️ File cleanup failed for bot ${deletedBot.id}:`,
          fileError.message
        );
        // Continue with bot deletion even if file cleanup fails
      }
    }

    // Remove bot from database
    botsData.bots.splice(botIndex, 1);
    await writeBots(botsData);

    console.log("🗑️ Bot deleted:", {
      id: req.params.id,
      botName: deletedBot.botName,
      ownerId: req.user.userId,
      filesDeleted: deletedBot.files?.length || 0,
    });

    // 🐍 Delete bot from Python RAG service
    try {
      const pythonResponse = await fetch(
        `http://localhost:8000/api/bots/${req.params.id}`,
        {
          method: "DELETE",
          headers: {
            "X-User-ID": req.user.userId,
            "X-Tenant-ID": req.user.tenantId,
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
        id: deletedBot.id,
        botName: deletedBot.botName,
        filesDeleted: deletedBot.files?.length || 0,
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

// Helper function to delete physical files
// server/src/controllers/botController.js - UPDATE deleteBotFiles function

// Helper function to delete physical files
async function deleteBotFiles(files) {
  console.log(`🗑️ Starting file deletion for ${files.length} files...`);

  const deletePromises = files.map(async (file) => {
    try {
      // Files are stored in the uploads directory with the storedAs filename
      if (file.storedAs) {
        // Use the same path resolution as in uploadController
        const UPLOAD_DIR = path.resolve(
          process.cwd(),
          process.env.UPLOAD_DIR || "uploads"
        );
        const filePath = path.join(UPLOAD_DIR, file.storedAs);

        console.log(`🔍 Attempting to delete file: ${filePath}`);
        console.log(`📁 File record:`, {
          original: file.filename,
          storedAs: file.storedAs,
          path: file.path,
        });

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
            // Also check if the file might be at the path stored in the file record
            if (file.path && file.path !== filePath) {
              try {
                await fs.access(file.path);
                console.log(`🔍 Found file at alternative path: ${file.path}`);
                await fs.unlink(file.path);
                console.log(
                  `✅ Successfully deleted file from alternative path: ${file.path}`
                );
                return {
                  success: true,
                  file: file.storedAs,
                  alternativePath: true,
                };
              } catch (altError) {
                // Ignore alternative path errors
              }
            }
            return { success: true, file: file.storedAs, alreadyGone: true };
          } else if (error.code === "EPERM" || error.code === "EBUSY") {
            console.warn(
              `⚠️ File locked or permission denied: ${file.storedAs}`
            );
            // Try again with a small delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
              await fs.unlink(filePath);
              console.log(
                `✅ Successfully deleted file on retry: ${file.storedAs}`
              );
              return { success: true, file: file.storedAs, retry: true };
            } catch (retryError) {
              console.error(
                `❌ Still cannot delete file: ${file.storedAs}`,
                retryError.message
              );
              return {
                success: false,
                file: file.storedAs,
                error: retryError.message,
              };
            }
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

  // Log detailed results
  results.forEach((result) => {
    if (!result.success) {
      console.error(`❌ Failed: ${result.file} - ${result.error}`);
    }
  });

  return results;
}

// server/src/controllers/botController.js - ADD this debug function

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
