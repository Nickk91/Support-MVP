// src/components/BotEditDialog/BotKnowledgeSettings.jsx - COMPLETE VERSION
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X, AlertTriangle } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BotKnowledgeSettings({
  bot,
  onChange,
  isEditing = false,
}) {
  const files = bot?.files || [];
  const fileInputRef = useRef(null);
  const { user } = useUserStore();

  // Track files marked for removal during edit
  const [filesToRemove, setFilesToRemove] = useState([]);

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);

    // Create file objects with ACTUAL user ID
    const newFiles = selectedFiles.map((file) => ({
      filename: file.name,
      storedAs: `temp_${Date.now()}_${file.name}`,
      size: file.size,
      mimetype: file.type,
      uploadedBy: user?.id || "unknown-user",
      // Store the actual file object for upload
      fileObject: file,
      // Mark as new file for replacement logic
      isNew: true,
    }));

    if (isEditing) {
      // During edit: replace all existing files with new ones
      // Mark existing files for removal
      const existingFilesToRemove = files
        .filter((f) => !f.isNew)
        .map((f) => f.storedAs);
      setFilesToRemove((prev) => [...prev, ...existingFilesToRemove]);

      // Update with only new files
      onChange({ files: newFiles });
    } else {
      // During create: add to existing files
      onChange({ files: [...files, ...newFiles] });
    }

    // Reset file input
    event.target.value = "";
  };

  const handleRemoveFile = (fileId) => {
    if (isEditing) {
      // During edit: mark file for removal but keep it in the list until save
      setFilesToRemove((prev) => [...prev, fileId]);

      // Update the file to mark it as removed (but keep in list for UI)
      const updatedFiles = files.map((file) =>
        file.storedAs === fileId ? { ...file, markedForRemoval: true } : file
      );
      onChange({ files: updatedFiles });
    } else {
      // During create: simply remove the file
      const updatedFiles = files.filter((file) => file.storedAs !== fileId);
      onChange({ files: updatedFiles });
    }
  };

  const handleRestoreFile = (fileId) => {
    // Remove from filesToRemove and unmark for removal
    setFilesToRemove((prev) => prev.filter((id) => id !== fileId));

    const updatedFiles = files.map((file) =>
      file.storedAs === fileId ? { ...file, markedForRemoval: false } : file
    );
    onChange({ files: updatedFiles });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Get files that are marked for removal
  const filesMarkedForRemoval = files.filter((f) => f.markedForRemoval);
  const activeFiles = files.filter((f) => !f.markedForRemoval);

  return (
    <div className="space-y-4">
      <div>
        <Label>Knowledge Base Files</Label>
        <p className="text-sm text-muted-foreground mb-3">
          {isEditing
            ? "Upload new documents to replace existing files. Old files will be automatically removed."
            : "Upload documents that your bot will use to answer questions."}
        </p>

        {isEditing && files.length > 0 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Editing Mode:</strong> Uploading new files will replace
              all existing files. Old files, chunks, and vectors will be
              automatically cleaned up.
            </AlertDescription>
          </Alert>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            {isEditing
              ? "Upload new files to replace existing ones"
              : "Drag and drop files here, or click to browse"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.txt,.md,.csv"
          />
          <Button onClick={triggerFileInput} variant="outline" type="button">
            <Upload className="h-4 w-4 mr-2" />
            {isEditing ? "Replace Files" : "Upload Files"}
          </Button>
        </div>
      </div>

      {/* Active Files */}
      {activeFiles.length > 0 && (
        <div className="space-y-2">
          <Label>
            {isEditing ? "New Files" : "Current Files"} ({activeFiles.length})
          </Label>
          <div className="space-y-2">
            {activeFiles.map((file) => (
              <div
                key={file.storedAs}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  file.isNew
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText
                    className={`h-4 w-4 ${
                      file.isNew ? "text-green-600" : "text-gray-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB •{" "}
                      {file.isNew ? "New" : "Existing"}
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

      {/* Files Marked for Removal */}
      {filesMarkedForRemoval.length > 0 && (
        <div className="space-y-2">
          <Label className="text-amber-600">
            Files to be Removed ({filesMarkedForRemoval.length})
          </Label>
          <div className="space-y-2">
            {filesMarkedForRemoval.map((file) => (
              <div
                key={file.storedAs}
                className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 border-amber-200"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium line-through">
                      {file.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • Will be deleted
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestoreFile(file.storedAs)}
                  className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
