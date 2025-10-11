// server/src/routes/uploads.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  upload,
  uploadFiles,
  handleUploadErrors,
} from "../controllers/uploadController.js";

const router = Router();

// POST /api/uploads/files
router.post(
  "/files",
  authenticateToken,
  upload.array("files", 10),
  uploadFiles,
  handleUploadErrors
);

export default router;
