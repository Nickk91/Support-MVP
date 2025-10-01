// src/features/onboarding/steps/StepKnowledge.jsx
import { useState } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

export default function StepKnowledge() {
  const { values, update, next, prev } = useWizardStore();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    update({ files });
  };

  async function uploadFiles(files) {
    const form = new FormData();
    for (const f of files) form.append("files", f);

    // Debug: confirm FormData contents in the browser
    for (const [k, v] of form.entries()) {
      console.log("FD", k, v?.name || v);
    }

    const res = await api.post("/uploads/files", form); // axios sets boundary
    return res.data; // { ok: true, files: [...] }
  }

  const handleUpload = async () => {
    if (!values.files?.length) return;
    setUploading(true);
    try {
      const data = await uploadFiles(values.files);
      console.log("[UPLOAD RESULT]", data);
      setUploaded(data.files || []);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <h3 className="mb-3 text-lg font-semibold">📚 Knowledge Base</h3>

      <div className="grid gap-2">
        <Input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.csv"
          onChange={onFiles}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!values.files?.length || uploading}
          >
            {uploading ? "Uploading…" : "Upload to Server"}
          </Button>
        </div>

        {uploaded.length > 0 && (
          <ul className="mt-2 text-sm">
            {uploaded.map((f) => (
              <li key={f.storedAs}>
                {f.filename} · {(f.size / 1024).toFixed(0)} KB · {f.mimetype}
              </li>
            ))}
          </ul>
        )}
      </div>

      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button onClick={next}>Next</Button>
      </StepActions>
    </>
  );
}
