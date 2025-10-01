// server/src/routes/uploads.js
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

const router = Router();

const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = nanoid();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${id}__${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  // If you re-enable fileFilter, ensure the mimetype list includes what you test with.
});

// POST /api/uploads/files
router.post("/files", upload.array("files", 10), (req, res) => {
  // Minimal debug
  console.log("[uploads] files length:", req.files?.length ?? 0);

  const files = (req.files || []).map((f) => ({
    filename: f.originalname,
    storedAs: f.filename,
    size: f.size,
    mimetype: f.mimetype,
    fieldname: f.fieldname,
  }));

  res.json({ ok: true, files });
});

export default router;
