import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

// Configure storage
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const id = nanoid();
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${id}__${safeName}`);
  },
});
const upload = multer({ storage });

// POST /api/uploads/files
router.post("/files", upload.array("files", 10), (req, res) => {
  const files = (req.files || []).map((f) => ({
    filename: f.originalname,
    storedAs: f.filename, // ✅ use Multer’s assigned filename
    size: f.size,
    mimetype: f.mimetype,
  }));
  res.json({ ok: true, files });
});

export default router;
