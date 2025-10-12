// src/features/onboarding/steps/StepKnowledge.jsx - Updated
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";

import api from "@/lib/api";
import { useEffect, useState } from "react";
export default function StepKnowledge() {
  const { values, update, next, prev } = useWizardStore();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setNeedsAuth(!token);
  }, []);

  const handleUpload = async () => {
    if (!values.files?.length) return;
    setUploading(true);

    try {
      // Debug: Check if we have a token
      const token = localStorage.getItem("authToken");
      console.log("🔐 Auth token present:", token ? "Yes" : "No");

      if (!token) {
        console.error("❌ No auth token found. Please login first.");
        setError("Please login before uploading files");
        return;
      }

      const formData = new FormData();
      values.files.forEach((file) => {
        formData.append("files", file);
        console.log("📁 Adding file:", file.name);
      });

      console.log("🚀 Sending upload request...");
      const { data } = await api.post("/uploads/files", formData);
      console.log("✅ Upload successful:", data);

      setUploaded(data.files || []);
    } catch (error) {
      console.error("❌ Upload failed:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      setError(error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
        <p className="text-muted-foreground mb-4">
          You need to create an account to upload documents and access advanced
          features.
        </p>
        <Button onClick={() => window.location.reload()}>
          Go Back to Registration
        </Button>
      </div>
    );
  }

  return (
    // ... your existing knowledge step JSX
    <>
      <h3 className="mb-3 text-lg font-semibold">📚 Knowledge Base</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload your documents to train your bot. Supported formats: PDF, Word,
        TXT, MD, CSV.
      </p>

      {/* Your existing file upload UI */}
      <div className="grid gap-2">
        <Input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.csv"
          onChange={(e) => update({ files: Array.from(e.target.files || []) })}
        />
        <Button
          onClick={handleUpload}
          disabled={!values.files?.length || uploading}
        >
          {uploading ? "Uploading…" : "Upload to Knowledge Base"}
        </Button>
      </div>

      {/* Uploaded files list */}
      {uploaded.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Uploaded Files:</h4>
          <ul className="space-y-1">
            {uploaded.map((file, index) => (
              <li key={index} className="text-sm flex items-center gap-2">
                <span>✅</span>
                <span>{file.filename}</span>
                <span className="text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button onClick={next}>
          {uploaded.length > 0 ? "Continue to Preview" : "Skip Upload"}
        </Button>
      </StepActions>
    </>
  );
}
