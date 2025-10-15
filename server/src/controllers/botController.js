// server/src/controllers/botController.js - UPDATED
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to JSON files
const BOTS_FILE = path.join(__dirname, "../../data/bots/bots.json");
const USERS_FILE = path.join(__dirname, "../../data/users/users.json");

// Helper function to read users from JSON
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { users: [], lastId: 0 };
  }
}

// Helper function to read bots from JSON
async function readBots() {
  try {
    const data = await fs.readFile(BOTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { bots: [], lastId: 0 };
  }
}

// Helper function to write bots to JSON
async function writeBots(botsData) {
  await fs.writeFile(BOTS_FILE, JSON.stringify(botsData, null, 2));
}

// Create new bot
export const createBot = async (req, res) => {
  try {
    const { botName, model, systemMessage, fallback, escalation, files } =
      req.body;

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
      escalation: escalation || { enabled: false, escalation_email: "" }, // ✅ Updated
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

    console.log("✅ Bot created:", {
      id: botId,
      botName,
      ownerId: req.user.userId,
      tenantId: req.user.tenantId,
    });

    res.status(201).json({
      ok: true,
      bot: newBot,
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

// Update bot (with ownerId security)
export const updateBot = async (req, res) => {
  try {
    const { botName, model, systemMessage, fallback, escalation, files } =
      req.body;

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
    botsData.bots[botIndex] = {
      ...botsData.bots[botIndex],
      botName,
      model,
      systemMessage,
      fallback,
      escalation,
      files,
      updatedAt: new Date().toISOString(),
    };

    await writeBots(botsData);

    console.log("✅ Bot updated:", {
      id: req.params.id,
      botName,
      ownerId: req.user.userId,
    });

    res.json({
      ok: true,
      bot: botsData.bots[botIndex],
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

    // Remove bot
    botsData.bots.splice(botIndex, 1);
    await writeBots(botsData);

    console.log("🗑️ Bot deleted:", {
      id: req.params.id,
      botName: deletedBot.botName,
      ownerId: req.user.userId,
    });

    res.json({
      ok: true,
      message: "Bot deleted successfully",
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
