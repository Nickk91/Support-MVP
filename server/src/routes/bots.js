// server/src/routes/bots.js
import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { Bot } from "../models/Bot.js";

const router = Router();
const USE_MONGO = process.env.USE_MONGO === "1";

/** ---------- File store fallback ---------- **/
const DATA_DIR = path.resolve(process.cwd(), "data");
const BOTS_FILE = path.join(DATA_DIR, "bots.json");

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BOTS_FILE))
    fs.writeFileSync(BOTS_FILE, JSON.stringify([]), "utf8");
}
function readBots() {
  ensureData();
  return JSON.parse(fs.readFileSync(BOTS_FILE, "utf8"));
}
function writeBots(bots) {
  ensureData();
  fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2), "utf8");
}

/** ---------- Routes ---------- **/

// Create bot
router.post("/", async (req, res) => {
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

    if (USE_MONGO) {
      const doc = await Bot.create({
        botName,
        systemMessage: payload.systemMessage || "",
        personality: payload.personality || "Friendly",
        model: payload.model || "gpt-4o-mini",
        fallback: payload.fallback || "",
        escalation: payload.escalation || { enabled: false, email: "" },
        files: payload.files || [],
      });
      return res.status(201).json({ ok: true, bot: toApi(doc) });
    } else {
      const bot = {
        id: nanoid(),
        createdAt: new Date().toISOString(),
        botName,
        systemMessage: payload.systemMessage || "",
        personality: payload.personality || "Friendly",
        model: payload.model || "gpt-4o-mini",
        fallback: payload.fallback || "",
        escalation: payload.escalation || { enabled: false, email: "" },
        files: payload.files || [],
      };
      const bots = readBots();
      bots.push(bot);
      writeBots(bots);
      return res.status(201).json({ ok: true, bot });
    }
  } catch (err) {
    console.error("[bots:create] error", err);
    res
      .status(500)
      .json({ ok: false, error: "server_error", message: err.message });
  }
});

// List bots
router.get("/", async (_req, res) => {
  try {
    if (USE_MONGO) {
      const docs = await Bot.find().sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, bots: docs.map(toApi) });
    } else {
      const bots = readBots();
      return res.json({ ok: true, bots });
    }
  } catch (err) {
    res
      .status(500)
      .json({ ok: false, error: "server_error", message: err.message });
  }
});

// Get bot by id
router.get("/:id", async (req, res) => {
  try {
    if (USE_MONGO) {
      const doc = await Bot.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ ok: false, error: "not_found" });
      return res.json({ ok: true, bot: toApi(doc) });
    } else {
      const bots = readBots();
      const bot = bots.find((b) => b.id === req.params.id);
      if (!bot) return res.status(404).json({ ok: false, error: "not_found" });
      return res.json({ ok: true, bot });
    }
  } catch (err) {
    res
      .status(500)
      .json({ ok: false, error: "server_error", message: err.message });
  }
});

/** ---------- helpers ---------- **/
function toApi(doc) {
  // Normalize Mongoose doc to your API shape
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
  };
}

export default router;
