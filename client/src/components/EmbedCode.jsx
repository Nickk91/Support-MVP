// src/components/EmbedCode.jsx
import React, { useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";

const EmbedCode = ({ botId, tenantId }) => {
  const [copied, setCopied] = useState(false);

  const embedCode = `
<!-- AI Chat Widget -->
<script>
window.ChatWidgetConfig = {
  botId: '${botId}',
  tenantId: '${tenantId}',
  apiUrl: 'https://your-domain.com/api'
};
</script>
<script src="https://your-domain.com/chat-widget.js" defer></script>
<!-- End AI Chat Widget -->
  `.trim();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Embed Code</h3>
      <p className="text-gray-600 mb-4">
        Add this code to your website to enable the chat widget:
      </p>

      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          {embedCode}
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-md transition-colors duration-200"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <DocumentDuplicateIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">
          Implementation Notes:
        </h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Place this code in the &lt;head&gt; section of your website</li>
          <li>• Replace 'your-domain.com' with your actual domain</li>
          <li>
            • The widget will appear in the bottom-right corner of your site
          </li>
          <li>• No additional CSS required - fully self-contained</li>
        </ul>
      </div>
    </div>
  );
};

export default EmbedCode;
