import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import EmptyChatState from "./EmptyChatState";

export default function ChatMessagesArea({ messages, loading, scrollAreaRef }) {
  return (
    <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
      <div className="space-y-4 pb-4">
        {messages.length === 0 ? (
          <EmptyChatState />
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {loading && <TypingIndicator />}
      </div>
    </ScrollArea>
  );
}
