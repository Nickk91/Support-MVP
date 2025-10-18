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

async function readBots() {
  try {
    const data = await fs.readFile(BOTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { bots: [], lastId: 0 };
  }
}

async function writeBots(botsData) {
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
// server/src/controllers/botController.js - UPDATE deleteBot function

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
async function deleteBotFiles(files) {
  const deletePromises = files.map(async (file) => {
    try {
      // Files are stored in the uploads directory with the storedAs filename
      if (file.storedAs) {
        const filePath = path.join(process.cwd(), "uploads", file.storedAs);

        // Check if file exists before trying to delete
        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
          console.log(`✅ Deleted file: ${file.storedAs}`);
          return { success: true, file: file.storedAs };
        } catch (error) {
          if (error.code === "ENOENT") {
            console.log(`ℹ️ File already deleted: ${file.storedAs}`);
            return { success: true, file: file.storedAs, alreadyGone: true };
          }
          throw error;
        }
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
    `📊 File deletion results: ${successful} successful, ${failed} failed`
  );

  return results;
}
