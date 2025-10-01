import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { nanoid } from "nanoid";

const router = Router();

const DATA_DIR = path.resolve(process.cwd(), "data");
const BOTS_DIR = path.join(DATA_DIR, "bots");
if (!fs.existsSync(BOTS_DIR)) fs.mkdirSync(BOTS_DIR, { recursive: true });

const botPath = (id) => path.join(BOTS_DIR, `${id}.json`);

// GET /api/bots (dev helper)
router.get("/", async (_req, res) => {
  try {
    const files = await fsp.readdir(BOTS_DIR);
    const bots = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fsp.readFile(path.join(BOTS_DIR, f), "utf8");
      bots.push(JSON.parse(raw));
    }
    res.json({ ok: true, bots });
  } catch (e) {
    res
      .status(500)
      .json({ ok: false, error: "list_failed", message: e.message });
  }
});

// GET /api/bots/:id
router.get("/:id", async (req, res) => {
  try {
    const full = botPath(req.params.id);
    const raw = await fsp.readFile(full, "utf8");
    res.json({ ok: true, bot: JSON.parse(raw) });
  } catch {
    res.status(404).json({ ok: false, error: "not_found" });
  }
});

// POST /api/bots
router.post("/", async (req, res) => {
  // Expect frontend to send: { name, model, personality, fallback, escalation, files }
  // `files` should be an array of { storedAs, filename, size, mimetype } from upload response
  const { name, model, personality, fallback, escalation, files } =
    req.body || {};

  // tiny validation
  if (!name || typeof name !== "string") {
    return res.status(400).json({ ok: false, error: "name_required" });
  }
  if (!model || typeof model !== "string") {
    return res.status(400).json({ ok: false, error: "model_required" });
  }

  const id = nanoid();
  const bot = {
    id,
    name,
    model,
    personality: personality || "Friendly",
    fallback: fallback || "",
    escalation: escalation || { enabled: false, email: "" },
    files: Array.isArray(files) ? files : [],
    createdAt: new Date().toISOString(),
    status: "ready",
  };

  try {
    await fsp.writeFile(botPath(id), JSON.stringify(bot, null, 2), "utf8");
    res.status(201).json({ ok: true, bot });
  } catch (e) {
    res
      .status(500)
      .json({ ok: false, error: "persist_failed", message: e.message });
  }
});

export default router;
