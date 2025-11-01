// server/src/routes/templates.js
import express from "express";
const router = express.Router();
import {
  PERSONALITY_TEMPLATES,
  SAFETY_TEMPLATES,
} from "../utils/botTemplateComposer.js";

// Get all templates
router.get("/", (req, res) => {
  res.json({
    personality: PERSONALITY_TEMPLATES,
    safety: SAFETY_TEMPLATES,
  });
});

// Get personality templates only
router.get("/personality", (req, res) => {
  res.json(PERSONALITY_TEMPLATES);
});

// Get safety templates only
router.get("/safety", (req, res) => {
  res.json(SAFETY_TEMPLATES);
});

export default router;
