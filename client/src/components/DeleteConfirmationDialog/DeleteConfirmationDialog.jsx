// src/components/DeleteConfirmationDialog/DeleteConfirmationDialog.jsx - NEW FILE
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  bot,
  onConfirm,
  loading = false,
}) {
  const handleConfirm = () => {
    onConfirm(bot);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle>Delete Bot</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete <strong>"{bot?.botName}"</strong>?
            This action cannot be undone and all associated data will be
            permanently removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex space-x-2 sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button variant="outline" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
