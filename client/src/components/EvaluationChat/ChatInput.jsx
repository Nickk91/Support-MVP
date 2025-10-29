import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export default function ChatInput({
  inputMessage,
  setInputMessage,
  onSendMessage,
  loading,
  sessionActive,
}) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex gap-2 pt-4 border-t">
      <Input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        disabled={loading || !sessionActive}
        className="flex-1"
      />
      <Button
        onClick={onSendMessage}
        disabled={!inputMessage.trim() || loading || !sessionActive}
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
