// client/src/components/EvaluationChat/EvaluationChat.jsx - FIXED
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import ChatHeader from "./ChatHeader";
import ChatMessagesArea from "./ChatMessagesArea";
import ChatInput from "./ChatInput";

export default function EvaluationChat({ bot, session, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (session?.messages) {
      setMessages(session.messages);
    } else {
      setMessages([]);
    }
  }, [session]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      if (!session?.session_id) {
        throw new Error("Evaluation session not started properly");
      }

      const response = await api.post("/evaluate/chat", {
        sessionId: session.session_id,
        message: inputMessage.trim(),
        botId: bot._id,
      });

      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: response.data.response,
        sources: response.data.sources || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        sources: [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <ChatHeader bot={bot} session={session} />

        <ChatMessagesArea
          messages={messages}
          loading={loading}
          scrollAreaRef={scrollAreaRef}
        />

        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={sendMessage}
          loading={loading}
          sessionActive={!!session?.session_id}
        />
      </DialogContent>
    </Dialog>
  );
}
