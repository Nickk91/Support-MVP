// src/components/ChatPreview.jsx
import { useState } from "react";

export default function ChatPreview() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ask me about your product or policy!" },
  ]);
  const [text, setText] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setText("");
    // mock reply
    const reply = {
      role: "assistant",
      content: `Here's what I found for: "${userMsg.content}" (Mocked RAG)\n• Source: docs/faq.pdf`,
    };
    setTimeout(() => setMessages((m) => [...m, reply]), 300);
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 12,
      }}
    >
      <div
        style={{
          height: 220,
          overflowY: "auto",
          padding: 8,
          background: "rgba(0,0,0,.03)",
          borderRadius: 8,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              margin: "6px 0",
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 12,
                background:
                  m.role === "user" ? "var(--primary)" : "var(--card)",
                color: m.role === "user" ? "#fff" : "var(--fg)",
                border:
                  m.role === "user"
                    ? "1px solid var(--primary)"
                    : "1px solid var(--border)",
              }}
            >
              {m.content}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a question…"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
          }}
        />
        <button
          onClick={send}
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
