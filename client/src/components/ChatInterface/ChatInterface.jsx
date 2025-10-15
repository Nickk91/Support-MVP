// src/components/ChatInterface/ChatInterface.jsx
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

export default function ChatInterface({
  botId,
  tenantId,
  mode = "preview", // 'preview' | 'widget'
  onSendMessage,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Ask me about your product or policy!",
      timestamp: new Date().toISOString(), // FIX: Add timestamp to initial message
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef(null);

  // Auto-scroll to last message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInputText("");
    setIsLoading(true);

    if (mode === "preview") {
      // Mock response for preview mode
      setTimeout(() => {
        const reply = {
          role: "assistant",
          content: `Here's what I found for: "${userMsg.content}" (Mocked RAG)\n• Source: docs/faq.pdf`,
          timestamp: new Date().toISOString(),
        };
        setMessages((m) => [...m, reply]);
        setIsLoading(false);
      }, 300);
    } else {
      // Real API call for widget mode
      try {
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            message: text,
            botId,
            tenantId,
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const data = await response.json();
        const botMessage = {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
          sources: data.sources || [],
        };

        setMessages((m) => [...m, botMessage]);
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage = {
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again later.",
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((m) => [...m, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return ""; // Handle missing timestamps
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return ""; // Fallback for invalid dates
    }
  };

  // Render different container based on mode
  const Container = mode === "preview" ? Card : "div";
  const containerProps =
    mode === "preview"
      ? { className: "border" }
      : {
          className:
            "fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50",
        };

  return (
    <Container {...containerProps}>
      {mode === "widget" && (
        // Widget header
        <div className="bg-blue-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-blue-100 text-sm">We're here to help</p>
          </div>
        </div>
      )}

      <CardContent
        className={mode === "preview" ? "p-3" : "p-0 flex-1 flex flex-col"}
      >
        {/* Messages */}
        <div
          ref={listRef}
          className={[
            "overflow-y-auto rounded-md border bg-card/50 p-3",
            mode === "preview" ? "h-60" : "flex-1",
          ].join(" ")}
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
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm border whitespace-pre-wrap",
                    isUser
                      ? "bg-primary text-primary-foreground border-primary"
                      : m.isError
                      ? "bg-red-100 text-red-800 border-red-200"
                      : "bg-card text-foreground border-border",
                  ].join(" ")}
                >
                  <div>{m.content}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Sources:</p>
                      <div className="space-y-1">
                        {m.sources.map((source, index) => (
                          <div
                            key={index}
                            className="text-xs text-blue-600 truncate"
                          >
                            {source}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Only show timestamp if it exists */}
                  {m.timestamp && (
                    <div
                      className={`text-xs mt-1 ${
                        isUser
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(m.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-none p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className={
            mode === "preview"
              ? "mt-3 flex items-center gap-2"
              : "p-4 border-t border-gray-200"
          }
        >
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a question…"
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            size={mode === "widget" ? "icon" : "default"}
            className={mode === "widget" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {mode === "widget" ? (
              <PaperAirplaneIcon className="h-4 w-4" />
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </CardContent>
    </Container>
  );
}
