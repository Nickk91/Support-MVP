// src/components/BotEditDialog/BotKnowledgeSettings.jsx
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";

export default function BotKnowledgeSettings({ bot, onChange }) {
  const files = bot?.files || [];

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);

    // Create file objects for the store
    const newFiles = selectedFiles.map((file) => ({
      filename: file.name,
      storedAs: `temp_${Date.now()}_${file.name}`,
      size: file.size,
      mimetype: file.type,
      uploadedBy: "current-user", // This should come from auth context
      tenantId: "current-tenant", // This should come from auth context
    }));

    // Update store with new files
    onChange({
      files: [...files, ...newFiles],
    });

    // Reset file input
    event.target.value = "";
  };

  const handleRemoveFile = (fileId) => {
    const updatedFiles = files.filter((file) => file.storedAs !== fileId);
    onChange({ files: updatedFiles });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Knowledge Base Files</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Upload documents that your bot will use to answer questions.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or click to browse
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.txt,.md,.csv"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </label>
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Current Files ({files.length})</Label>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.storedAs}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(file.storedAs)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
