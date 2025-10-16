// src/pages/ChatTest.jsx
import React from "react";
import { useParams } from "react-router-dom";
import ChatWidget from "../components/ChatWidget/ChatWidget";
import { useStore } from "../store/useUserStore";

const ChatTest = () => {
  const { botId } = useParams();
  const { user } = useStore();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to test the chat widget.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat Widget Test
          </h1>
          <p className="text-gray-600">
            Test your AI assistant with the chat widget below
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Bot Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">Bot ID:</span>
                <span className="ml-2 text-gray-900">{botId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-500">Tenant ID:</span>
                <span className="ml-2 text-gray-900">{user.tenant_id}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Testing Instructions
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>The chat widget appears in the bottom-right corner</li>
              <li>Click the chat icon to open the widget</li>
              <li>Ask questions about your uploaded documents</li>
              <li>Test the response quality and speed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget botId={botId} tenantId={user.tenant_id} />
    </div>
  );
};

export default ChatTest;
