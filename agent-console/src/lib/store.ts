// src/lib/store.ts
import { create } from "zustand";
import { ChatMessage, ConnectionState, ServerMessage, TraceEvent } from "./types";
import { AgentConnection } from "./AgentConnection";

interface AppState {
  connectionState: ConnectionState;
  messages: ChatMessage[];
  traceEvents: TraceEvent[];
  contexts: Record<string, Record<string, unknown>[]>; // context_id -> history of snapshots
  activeContextId: string | null;
  contextHistoryIndex: number;
  
  // Actions
  setConnectionState: (state: ConnectionState) => void;
  addUserMessage: (content: string) => void;
  processServerMessage: (msg: ServerMessage) => void;
  setActiveContext: (id: string, index?: number) => void;
}

export const connection = new AgentConnection("ws://localhost:4747/ws");

export const useAppStore = create<AppState>((set, get) => ({
  connectionState: "disconnected",
  messages: [],
  traceEvents: [],
  contexts: {},
  activeContextId: null,
  contextHistoryIndex: 0,

  setConnectionState: (state) => set({ connectionState: state }),

  addUserMessage: (content) => {
    set((state) => ({ messages: [...state.messages, { role: "user", content }], }));
    // Reset the sequence counter for the new conversation turn!
    connection.resetSequence();
    connection.send({ type: "USER_MESSAGE", content });
  },

  processServerMessage: (msg) => {
    set((state) => {
      const newMessages = [...state.messages];
      const newTraceEvents = [...state.traceEvents];
      const newContexts = { ...state.contexts };
      let newActiveContextId = state.activeContextId;
      let newContextHistoryIndex = state.contextHistoryIndex;

      // --- 1. Update Trace Timeline (Grouping Tokens) ---
      const lastEvent = newTraceEvents[newTraceEvents.length - 1];
      if (msg.type === "TOKEN" && lastEvent && lastEvent.type === "TOKEN_GROUP" && lastEvent.stream_id === msg.stream_id) {
        lastEvent.count += 1;
        lastEvent.text += msg.text;
        lastEvent.endTime = Date.now();
      } else if (msg.type === "TOKEN") {
        newTraceEvents.push({ type: "TOKEN_GROUP", stream_id: msg.stream_id, count: 1, text: msg.text, startTime: Date.now(), endTime: Date.now() });
      } else {
        newTraceEvents.push(msg);
      }

      // --- 2. Update Chat State ---
      if (msg.type === "TOKEN" || msg.type === "TOOL_CALL" || msg.type === "TOOL_RESULT" || msg.type === "STREAM_END") {
        let agentMsg = newMessages.find((m) => m.role === "agent" && m.stream_id === msg.stream_id) as any;
        
        if (!agentMsg) {
          agentMsg = { role: "agent", stream_id: msg.stream_id, blocks: [{ type: "text", content: "" }], isComplete: false };
          newMessages.push(agentMsg);
        }

        if (msg.type === "TOKEN") {
          let lastBlock = agentMsg.blocks[agentMsg.blocks.length - 1];
          if (lastBlock?.type !== "text") {
            lastBlock = { type: "text", content: "" };
            agentMsg.blocks.push(lastBlock);
          }
          lastBlock.content += msg.text;
        } 
        else if (msg.type === "TOOL_CALL") {
          agentMsg.blocks.push({ type: "tool", call_id: msg.call_id, tool_name: msg.tool_name, args: msg.args });
        } 
        else if (msg.type === "TOOL_RESULT") {
          const toolBlock = agentMsg.blocks.find((b: any) => b.type === "tool" && b.call_id === msg.call_id);
          if (toolBlock) toolBlock.result = msg.result;
        } 
        else if (msg.type === "STREAM_END") {
          agentMsg.isComplete = true;
        }
      }

      // --- 3. Update Context Inspector ---
      if (msg.type === "CONTEXT_SNAPSHOT") {
        const history = newContexts[msg.context_id] || [];
        newContexts[msg.context_id] = [...history, msg.data];
        newActiveContextId = msg.context_id;
        newContextHistoryIndex = newContexts[msg.context_id].length - 1;
      }

      return { 
        messages: newMessages, 
        traceEvents: newTraceEvents, 
        contexts: newContexts,
        activeContextId: newActiveContextId,
        contextHistoryIndex: newContextHistoryIndex
      };
    });
  },

  setActiveContext: (id, index) => set((state) => ({
    activeContextId: id,
    contextHistoryIndex: index ?? (state.contexts[id]?.length - 1 || 0)
  }))
}));

// Wire up the connection to the store
connection.onMessage = (msg) => useAppStore.getState().processServerMessage(msg);
connection.onStateChange = (state) => useAppStore.getState().setConnectionState(state);