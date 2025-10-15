// src/components/ChatWidget/ChatWidget.jsx
import { useState } from "react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import ChatInterface from "../ChatInterface/ChatInterface";

export default function ChatWidget({ botId, tenantId }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="...">
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
      </button>
    );
  }

  return <ChatInterface botId={botId} tenantId={tenantId} mode="widget" />;
}
