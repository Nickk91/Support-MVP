// server/src/controllers/botController.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to bots JSON file
const BOTS_FILE = path.join(__dirname, "../../data/bots/bots.json");

// Helper function to read bots from JSON
async function readBots() {
  try {
    const data = await fs.readFile(BOTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default structure
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
    const {
      botName,
      model,
      personality,
      systemMessage,
      fallback,
      escalation,
      files,
    } = req.body;

    console.log("🤖 Creating bot for tenant:", req.user.tenantId);
    console.log("👤 User ID from token:", req.user.userId);
    console.log("📦 Bot data:", { botName, model, personality });

    // Validation
    if (!botName || !model) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        message: "Bot name and model are required",
      });
    }

    // Read existing bots
    const botsData = await readBots();

    console.log("📋 Current bots in JSON:", botsData.bots.length);
    console.log("📋 Current users in JSON:", usersData.users.length);

    // Check for duplicate bot name within tenant
    const duplicateBot = botsData.bots.find(
      (bot) => bot.botName === botName && bot.tenantId === req.user.tenantId
    );

    if (duplicateBot) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "A bot with this name already exists in your workspace",
      });
    }

    // Create new bot
    const botId = (botsData.lastId + 1).toString();

    const newBot = {
      id: botId,
      botName,
      model,
      personality: personality || "Friendly",
      systemMessage: systemMessage || "",
      fallback: fallback || "",
      escalation: escalation || { enabled: false, email: "" },
      files: files || [],
      tenantId: req.user.tenantId,
      ownerId: req.user.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add bot to data and update lastId
    botsData.bots.push(newBot);
    botsData.lastId = parseInt(botId);

    // Write back to file
    await writeBots(botsData);

    console.log("✅ Bot created:", {
      id: botId,
      botName,
      tenantId: req.user.tenantId,
    });

    res.status(201).json({
      ok: true,
      bot: {
        id: newBot.id,
        botName: newBot.botName,
        model: newBot.model,
        personality: newBot.personality,
        systemMessage: newBot.systemMessage,
        fallback: newBot.fallback,
        escalation: newBot.escalation,
        files: newBot.files,
        createdAt: newBot.createdAt,
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

// Get all bots for tenant
export const getBots = async (req, res) => {
  try {
    const botsData = await readBots();
    const userBots = botsData.bots.filter(
      (bot) => bot.tenantId === req.user.tenantId
    );

    res.json({
      ok: true,
      bots: userBots,
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

// Get single bot
export const getBot = async (req, res) => {
  try {
    const botsData = await readBots();
    const bot = botsData.bots.find(
      (bot) => bot.id === req.params.id && bot.tenantId === req.user.tenantId
    );

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found",
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

// Update bot
export const updateBot = async (req, res) => {
  try {
    const {
      botName,
      model,
      personality,
      systemMessage,
      fallback,
      escalation,
      files,
    } = req.body;

    const botsData = await readBots();
    const botIndex = botsData.bots.findIndex(
      (bot) => bot.id === req.params.id && bot.tenantId === req.user.tenantId
    );

    if (botIndex === -1) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found",
      });
    }

    // Check for duplicate name (excluding current bot)
    const duplicateBot = botsData.bots.find(
      (bot) =>
        bot.botName === botName &&
        bot.tenantId === req.user.tenantId &&
        bot.id !== req.params.id
    );

    if (duplicateBot) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "A bot with this name already exists",
      });
    }

    // Update bot
    botsData.bots[botIndex] = {
      ...botsData.bots[botIndex],
      botName,
      model,
      personality,
      systemMessage,
      fallback,
      escalation,
      files,
      updatedAt: new Date().toISOString(),
    };

    await writeBots(botsData);

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

// Delete bot
export const deleteBot = async (req, res) => {
  try {
    const botsData = await readBots();
    const botIndex = botsData.bots.findIndex(
      (bot) => bot.id === req.params.id && bot.tenantId === req.user.tenantId
    );

    if (botIndex === -1) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found",
      });
    }

    // Remove bot
    botsData.bots.splice(botIndex, 1);
    await writeBots(botsData);

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
