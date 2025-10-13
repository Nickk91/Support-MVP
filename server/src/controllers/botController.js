// server/src/controllers/botController.js
import { Bot } from "../models/Bot.js";

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
    console.log("📦 Bot data:", { botName, model, personality });

    // Validation
    if (!botName || !model) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        message: "Bot name and model are required",
      });
    }

    // Create bot with tenant isolation
    const bot = await Bot.create({
      botName,
      model,
      personality: personality || "Friendly",
      systemMessage: systemMessage || "",
      fallback: fallback || "",
      escalation: escalation || { enabled: false, email: "" },
      files: files || [],
      tenantId: req.user.tenantId,
      ownerId: req.user.userId,
    });

    res.status(201).json({
      ok: true,
      bot: {
        id: bot._id,
        botName: bot.botName,
        model: bot.model,
        personality: bot.personality,
        systemMessage: bot.systemMessage,
        fallback: bot.fallback,
        escalation: bot.escalation,
        files: bot.files,
        createdAt: bot.createdAt,
      },
    });
  } catch (error) {
    console.error("[bot:create] error:", error);

    // Handle duplicate bot names within tenant
    if (error.code === 11000) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "A bot with this name already exists in your workspace",
      });
    }

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
    const bots = await Bot.find({
      tenantId: req.user.tenantId,
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    res.json({
      ok: true,
      bots,
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
    const bot = await Bot.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

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

    const bot = await Bot.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.user.tenantId,
      },
      {
        botName,
        model,
        personality,
        systemMessage,
        fallback,
        escalation,
        files,
      },
      { new: true, runValidators: true }
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
    console.error("[bot:update] error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        ok: false,
        error: "duplicate_bot",
        message: "A bot with this name already exists",
      });
    }

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
    const bot = await Bot.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "bot_not_found",
        message: "Bot not found",
      });
    }

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
