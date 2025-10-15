// src/hooks/useChat.js
import { useState, useRef, useEffect } from "react";

export function useChat(mode = "preview") {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ask me about your product or policy!" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef(null);

  // Shared logic here...

  return {
    messages,
    inputText,
    setInputText,
    isLoading,
    listRef,
    sendMessage,
    onKeyDown,
  };
}
