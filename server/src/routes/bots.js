// server/src/routes/bots.js
import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

const router = Router();

// Very simple JSON file store
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

// Create bot
router.post("/", (req, res) => {
  const payload = req.body || {};
  const botName = String(payload.botName || "").trim();

  if (!botName) {
    return res
      .status(400)
      .json({
        ok: false,
        error: "validation_error",
        message: "botName is required",
      });
  }

  const bot = {
    id: nanoid(),
    createdAt: new Date().toISOString(),
    botName,
    personality: payload.personality || "Friendly",
    model: payload.model || "gpt-4o-mini",
    fallback: payload.fallback || "",
    escalation: payload.escalation || { enabled: false, email: "" },
    // future: connectors, uploaded files, org id, owner id, etc.
  };

  const bots = readBots();
  bots.push(bot);
  writeBots(bots);

  return res.status(201).json({ ok: true, bot });
});

// List bots
router.get("/", (_req, res) => {
  const bots = readBots();
  res.json({ ok: true, bots });
});

// Get bot by id
router.get("/:id", (req, res) => {
  const bots = readBots();
  const bot = bots.find((b) => b.id === req.params.id);
  if (!bot) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, bot });
});

export default router;
