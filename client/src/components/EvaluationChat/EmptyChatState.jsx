import { Bot } from "lucide-react";

export default function EmptyChatState() {
  return (
    <div className="text-center text-muted-foreground py-8">
      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Start a conversation to test your bot</p>
      <p className="text-sm">
        Ask questions related to your uploaded documents
      </p>
    </div>
  );
}
