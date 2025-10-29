import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";

export default function ChatMessage({ message }) {
  const isUser = message.type === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((source, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs opacity-70 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
