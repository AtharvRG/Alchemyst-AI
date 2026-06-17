// src/components/Chat.tsx
import { useState } from "react";
import { useAppStore } from "../lib/store";
import { Send, Loader2, Wrench, CheckCircle } from "lucide-react";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, addUserMessage, connectionState } = useAppStore();

  const handleSend = () => {
    if (!input.trim()) return;
    addUserMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Reconnection Indicator */}
      {connectionState === "reconnecting" && (
        <div className="bg-yellow-500 text-white text-sm py-1 px-4 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Connection lost. Reconnecting...
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border shadow-sm"}`}>
              {msg.role === "user" ? (
                <p>{msg.content}</p>
              ) : (
                <div className="space-y-4">
                  {msg.blocks.map((block, j) => {
                    if (block.type === "text") {
                      return <p key={j} className="whitespace-pre-wrap text-gray-800">{block.content}</p>;
                    }
                    if (block.type === "tool") {
                      return (
                        <div key={j} className="border rounded bg-gray-50 p-3 text-sm font-mono">
                          <div className="flex items-center gap-2 text-blue-600 mb-2 font-semibold">
                            {block.result ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                            <Wrench className="w-4 h-4" /> {block.tool_name}
                          </div>
                          <div className="text-gray-600">Args: {JSON.stringify(block.args)}</div>
                          {block.result && <div className="mt-2 text-green-700 border-t pt-2">Result: {JSON.stringify(block.result)}</div>}
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 disabled:opacity-50"
            placeholder="Ask the agent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={connectionState !== "connected"}
          />
          <button 
            onClick={handleSend}
            disabled={connectionState !== "connected"}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}