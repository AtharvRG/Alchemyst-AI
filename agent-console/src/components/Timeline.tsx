// src/components/Timeline.tsx
import { useAppStore } from "../lib/store";
import { Activity, Code, Database, MessageSquare } from "lucide-react";

export function Timeline() {
  const traceEvents = useAppStore((state) => state.traceEvents);

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <div className="p-3 border-b bg-gray-50 font-semibold flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4" /> Agent Trace
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs font-mono">
        {traceEvents.map((ev, i) => {
          if (ev.type === "TOKEN_GROUP") {
            return (
              <div key={i} className="p-2 bg-blue-50 text-blue-800 rounded border border-blue-100">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Streamed {ev.count} tokens ({(ev.endTime - ev.startTime)}ms)
              </div>
            );
          }
          if (ev.type === "TOOL_CALL" || ev.type === "TOOL_RESULT") {
            return (
              <div key={i} className={`p-2 rounded border text-grey-800 ${ev.type === "TOOL_CALL" ? "bg-purple-50 border-purple-200" : "bg-green-50 border-green-200 ml-4"}`}>
                <Code className="w-3 h-3 inline mr-1" />
                {ev.type === "TOOL_CALL" ? `CALL: ${ev.tool_name}` : `RESULT: ${ev.call_id}`}
              </div>
            );
          }
          if (ev.type === "CONTEXT_SNAPSHOT") {
            return (
              <div key={i} className="p-2 bg-orange-50 text-orange-800 rounded border border-orange-200">
                <Database className="w-3 h-3 inline mr-1" />
                CONTEXT: {ev.context_id}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}