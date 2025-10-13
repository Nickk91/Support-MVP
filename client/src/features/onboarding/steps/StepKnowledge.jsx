// src/features/onboarding/steps/StepKnowledge.jsx
import { useState } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { FolderOpenIcon } from "@heroicons/react/24/outline";

export default function StepKnowledge() {
  const { values, update, next, prev } = useWizardStore();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [error, setError] = useState("");

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    update({ files });
    setError(""); // Clear previous errors
  };

  const handleUpload = async () => {
    if (!values.files?.length) {
      setError("Please select files to upload");
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Please create an account or sign in to upload files");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      values.files.forEach((file) => {
        formData.append("files", file);
      });

      console.log("📤 Uploading files to server...");

      const { data } = await api.post("/uploads/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!data.ok) {
        throw new Error(data.message || "Upload failed");
      }

      console.log("✅ Upload successful:", data.files);

      // Store uploaded files in the store
      setUploaded(data.files || []);
      update({ uploadedFiles: data.files });
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError(err.message || "Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center mb-4">
        <FolderOpenIcon className="h-8 w-8 text-orange-600" />
      </div>

      <h3 className="mb-3 text-lg font-semibold text-center">Knowledge Base</h3>

      <p className="text-sm text-muted-foreground mb-4 text-center">
        Upload documents to train your AI assistant. Supported formats: PDF,
        Word, TXT, MD, CSV.
      </p>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="file-upload">Select Files</Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.csv"
            onChange={handleFileSelect}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!values.files?.length || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Uploading...
            </>
          ) : (
            "Upload to Knowledge Base"
          )}
        </Button>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}

        {uploaded.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Uploaded Files:</h4>
            <ul className="space-y-2">
              {uploaded.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{file.filename}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
