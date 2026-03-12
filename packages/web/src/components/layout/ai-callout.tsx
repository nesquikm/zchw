import { useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'agentview-ai-callout-dismissed';

export function AiCallout() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  if (dismissed) return null;

  return (
    <div
      role="status"
      className="mx-6 mt-4 flex items-start justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
    >
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-blue-900">
          Explore this data conversationally — connect AgentView to Claude Desktop or any
          MCP-compatible AI assistant
        </p>
        <p className="text-blue-600">AI chat with dynamic dashboard views — coming soon</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, 'true');
          setDismissed(true);
        }}
        className="ml-4 shrink-0 rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
      >
        <X size={16} />
      </button>
    </div>
  );
}
