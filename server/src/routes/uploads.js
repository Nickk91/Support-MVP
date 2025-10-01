// server/src/routes/uploads.js
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

const router = Router();

// 🔊 Log when this router file is loaded
console.log("[UPLOADS] Router module loaded");

// Resolve to absolute path and ensure the folder exists
const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);
console.log("[UPLOADS] Upload directory:", UPLOAD_DIR);

if (!fs.existsSync(UPLOAD_DIR)) {
  console.log("[UPLOADS] Creating upload directory");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`[UPLOADS] Saving file: ${file.originalname}`);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const id = nanoid();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    const filename = `${id}__${safe}`;
    console.log(`[UPLOADS] Generated filename: ${filename}`);
    cb(null, filename);
  },
});

// Multer instance - temporarily remove fileFilter to rule it out
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  // fileFilter removed for debugging
});

// 🔊 Debug middleware for ALL requests to this router
router.use((req, res, next) => {
  console.log(`[UPLOADS] Router hit: ${req.method} ${req.originalUrl}`);
  next();
});

// POST /api/uploads/files
router.post(
  "/files",
  (req, res, next) => {
    console.log("[UPLOADS] /files route handler started");
    console.log("[UPLOADS] Headers:", {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
    });
    next();
  },
  upload.any(),
  (req, res) => {
    console.log("[UPLOADS] Multer completed processing");

    // Check what multer received
    console.log("[UPLOADS] req.files:", req.files);
    console.log("[UPLOADS] req.body:", req.body);

    if (!req.files || req.files.length === 0) {
      console.log("[UPLOADS] WARNING: No files processed by multer");
      return res.json({
        ok: true,
        files: [],
        debug: {
          headers: {
            "content-type": req.headers["content-type"],
            "content-length": req.headers["content-length"],
          },
          message: "No files were processed by multer",
        },
      });
    }

    const files = req.files.map((f) => ({
      filename: f.originalname,
      storedAs: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      fieldname: f.fieldname,
    }));

    console.log("[UPLOADS] Successfully processed files:", files.length);

    // Verify files were actually written
    files.forEach((file) => {
      const filePath = path.join(UPLOAD_DIR, file.storedAs);
      const exists = fs.existsSync(filePath);
      console.log(`[UPLOADS] File ${file.storedAs} exists on disk:`, exists);
    });

    res.json({ ok: true, files });
  }
);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error("[UPLOADS] Error in uploads router:", error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      ok: false,
      error: "multer_error",
      message: error.message,
    });
  }
  res.status(500).json({
    ok: false,
    error: "upload_error",
    message: error.message,
  });
});

export default router;
