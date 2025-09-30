import { Router } from "express";
import { nanoid } from "nanoid";

const router = Router();
const bots = new Map(); // in-memory store for now

// POST /api/bots
router.post("/", (req, res) => {
  const {
    name = "My Bot",
    personality = "Friendly",
    model = "gpt-4o-mini",
  } = req.body || {};
  const id = nanoid();
  const bot = {
    id,
    name,
    personality,
    model,
    createdAt: new Date().toISOString(),
  };
  bots.set(id, bot);
  res.json(bot);
});

// GET /api/bots/:id
router.get("/:id", (req, res) => {
  const bot = bots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: "not_found" });
  res.json(bot);
});

export default router;
