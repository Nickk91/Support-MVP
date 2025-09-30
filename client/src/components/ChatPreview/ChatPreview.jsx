// src/components/ChatPreview.jsx
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatPreview() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ask me about your product or policy!" },
  ]);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    const userMsg = { role: "user", content: value };
    setMessages((m) => [...m, userMsg]);
    setText("");

    // mock reply
    const reply = {
      role: "assistant",
      content: `Here's what I found for: "${userMsg.content}" (Mocked RAG)\n• Source: docs/faq.pdf`,
    };
    setTimeout(() => setMessages((m) => [...m, reply]), 300);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // auto-scroll to last message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <Card className="border">
      <CardContent className="p-3">
        {/* messages */}
        <div
          ref={listRef}
          className="h-60 overflow-y-auto rounded-md border bg-card/50 p-3"
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={`my-1 flex ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                <span
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm border",
                    isUser
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border",
                  ].join(" ")}
                >
                  {m.content}
                </span>
              </div>
            );
          })}
        </div>

        {/* input row */}
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a question…"
            className="flex-1"
          />
          <Button onClick={send} disabled={!text.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
