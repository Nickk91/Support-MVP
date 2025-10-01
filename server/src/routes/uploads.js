// server/src/routes/uploads.js
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

const router = Router();

// Where to store uploads (env or ./uploads)
const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = nanoid();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${id}__${safe}`);
  },
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

// POST /api/uploads/files
router.post("/files", upload.array("files", 10), (req, res) => {
  const files = (req.files || []).map((f) => ({
    filename: f.originalname,
    storedAs: f.filename,
    size: f.size,
    mimetype: f.mimetype,
  }));
  // morgan will log the request; no noisy logs here
  return res.json({ ok: true, files });
});

// Multer / route-local error handler (optional but nice)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ ok: false, error: err.code, message: err.message });
  }
  if (err) {
    return res
      .status(400)
      .json({ ok: false, error: "upload_error", message: err.message });
  }
  res.status(500).json({ ok: false, error: "unknown_error" });
});

export default router;
