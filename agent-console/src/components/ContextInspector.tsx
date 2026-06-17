// src/components/ContextInspector.tsx
import { useState } from "react";
import { useAppStore } from "../lib/store";
import { ChevronRight, ChevronDown, History } from "lucide-react";

// Recursive performant JSON Tree
const JsonNode = ({ keyName, value, oldVal, depth = 0 }: any) => {
  const [expanded, setExpanded] = useState(depth < 1); // Collapse deep nodes to survive 500KB chaos
  const isObject = value !== null && typeof value === "object";
  
  // Diffing logic
  let status = "unchanged";
  if (oldVal === undefined && value !== undefined) status = "added";
  else if (oldVal !== undefined && value === undefined) status = "removed";
  else if (!isObject && oldVal !== value) status = "changed";

  const colorMap: any = { added: "bg-green-100 text-green-800", removed: "bg-red-100 text-red-800 line-through", changed: "bg-yellow-100 text-yellow-800", unchanged: "text-gray-700" };

  if (!isObject) {
    return (
      <div className="pl-4 py-0.5 flex">
        <span className="text-blue-600 mr-1">{keyName}:</span>
        <span className={`px-1 rounded ${colorMap[status]}`}>{String(value)}</span>
      </div>
    );
  }

  return (
    <div className="pl-4 py-0.5">
      <div className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
        <span className="text-blue-600 font-semibold">{keyName}</span>
        <span className="text-gray-400 text-xs ml-2">{Array.isArray(value) ? `[${value.length}]` : "{...}"}</span>
      </div>
      {expanded && (
        <div>
          {Object.keys(value).map((k) => (
            <JsonNode key={k} keyName={k} value={value[k]} oldVal={oldVal?.[k]} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export function ContextInspector() {
  const { contexts, activeContextId, contextHistoryIndex, setActiveContext } = useAppStore();

  if (!activeContextId) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-sm border-l bg-white">No context loaded</div>;
  }

  const history = contexts[activeContextId];
  const currentData = history[contextHistoryIndex];
  const prevData = contextHistoryIndex > 0 ? history[contextHistoryIndex - 1] : {};

  return (
    <div className="h-full flex flex-col bg-white border-l border-t">
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center text-sm">
        <span className="font-semibold text-gray-700">Context: {activeContextId}</span>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <input 
            type="range" 
            min={0} 
            max={history.length - 1} 
            value={contextHistoryIndex}
            onChange={(e) => setActiveContext(activeContextId, parseInt(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-gray-500">v{contextHistoryIndex + 1}/{history.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        <JsonNode keyName="root" value={currentData} oldVal={prevData} />
      </div>
    </div>
  );
}