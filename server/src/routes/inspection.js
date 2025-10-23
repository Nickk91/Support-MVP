import express from "express";
import inspectionController from "../controllers/inspectionController.js";

const router = express.Router();

console.log("🔍 Inspection routes module loaded");

// Get list of all processed documents for a bot
router.get("/documents/:botId", (req, res) => {
  console.log("📄 GET /documents/:botId hit", req.params.botId);
  inspectionController.listDocuments(req, res);
});

// Get parsing results for a specific document
router.get("/documents/:botId/:documentPath", (req, res) => {
  console.log("📄 GET /documents/:botId/:documentPath hit", req.params);
  inspectionController.inspectDocument(req, res);
});

// Test a query against a specific document
router.post("/documents/:botId/:documentPath/test-query", (req, res) => {
  console.log(
    "📄 POST /documents/:botId/:documentPath/test-query hit",
    req.params
  );
  inspectionController.testDocumentQuery(req, res);
});

export default router;
