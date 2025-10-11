// server/src/controllers/uploadController.js
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

// Configure multer (moved from routes)
const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);

// Ensure upload directory exists
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

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

// File upload handler
export const uploadFiles = async (req, res) => {
  try {
    const files = (req.files || []).map((f) => ({
      filename: f.originalname,
      storedAs: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      uploadedBy: req.user.userId,
      tenantId: req.user.tenantId,
    }));

    return res.json({ ok: true, files });
  } catch (error) {
    console.error("[upload:files] error:", error);
    return res.status(500).json({
      ok: false,
      error: "upload_error",
      message: "Failed to process upload",
    });
  }
};

// Error handler middleware
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      ok: false,
      error: err.code,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      ok: false,
      error: "upload_error",
      message: err.message,
    });
  }

  next();
};
