import { useState } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";

export default function StepKnowledge() {
  const { values, update, next, prev } = useWizardStore();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    update({ files });
  };

  const uploadFiles = async () => {
    if (!values.files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of values.files) fd.append("files", f);
      const res = await fetch("/api/uploads/files", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      setUploaded(json.files || []);
    } catch (e) {
      console.error(e);
      alert("Upload failed");
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
            onClick={uploadFiles}
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
