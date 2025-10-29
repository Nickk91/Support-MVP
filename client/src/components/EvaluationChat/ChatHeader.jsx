import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot } from "lucide-react";

export default function ChatHeader({ bot, session }) {
  return (
    <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4">
      <div>
        <DialogTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Testing: {bot.botName}
        </DialogTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {session?.session_id
            ? "Evaluation session active"
            : "Starting evaluation session..."}
        </p>
      </div>
    </DialogHeader>
  );
}
