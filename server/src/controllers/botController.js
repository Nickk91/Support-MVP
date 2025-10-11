// server/src/controllers/botController.js
import { Bot } from "../models/Bot.js";

// Create bot
export const createBot = async (req, res) => {
  try {
    const payload = req.body || {};
    const botName = String(payload.botName || "").trim();

    if (!botName) {
      return res.status(400).json({
        ok: false,
        error: "validation_error",
        message: "botName is required",
      });
    }

    const bot = await Bot.create({
      botName,
      systemMessage: payload.systemMessage || "",
      personality: payload.personality || "Friendly",
      model: payload.model || "gpt-4o-mini",
      fallback: payload.fallback || "",
      escalation: payload.escalation || { enabled: false, email: "" },
      files: payload.files || [],
      tenantId: req.user.tenantId,
      ownerId: req.user.userId,
    });

    res.status(201).json({
      ok: true,
      bot: toApi(bot),
    });
  } catch (err) {
    console.error("[bots:create] error", err);
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: err.message,
    });
  }
};

// List bots
export const listBots = async (req, res) => {
  try {
    const bots = await Bot.find({
      tenantId: req.user.tenantId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ok: true,
      bots: bots.map(toApi),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: err.message,
    });
  }
};

// Get bot by ID
export const getBot = async (req, res) => {
  try {
    const bot = await Bot.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    }).lean();

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
      });
    }

    res.json({
      ok: true,
      bot: toApi(bot),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: err.message,
    });
  }
};

// Update bot
export const updateBot = async (req, res) => {
  try {
    const bot = await Bot.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.user.tenantId,
        ownerId: req.user.userId,
      },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
      });
    }

    res.json({
      ok: true,
      bot: toApi(bot),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: err.message,
    });
  }
};

// Delete bot
export const deleteBot = async (req, res) => {
  try {
    const bot = await Bot.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      ownerId: req.user.userId,
    });

    if (!bot) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
      });
    }

    res.json({
      ok: true,
      message: "Bot deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "server_error",
      message: err.message,
    });
  }
};

// Helper function
function toApi(doc) {
  return {
    id: String(doc._id),
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    botName: doc.botName,
    systemMessage: doc.systemMessage ?? "",
    personality: doc.personality ?? "Friendly",
    model: doc.model,
    fallback: doc.fallback ?? "",
    escalation: doc.escalation ?? { enabled: false, email: "" },
    files: doc.files ?? [],
    tenantId: doc.tenantId,
    ownerId: doc.ownerId,
  };
}
