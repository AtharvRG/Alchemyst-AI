// src/lib/types.ts
export type ServerMessage =
  | { type: "TOKEN"; seq: number; text: string; stream_id: string }
  | { type: "TOOL_CALL"; seq: number; call_id: string; tool_name: string; args: Record<string, unknown>; stream_id: string }
  | { type: "TOOL_RESULT"; seq: number; call_id: string; result: Record<string, unknown>; stream_id: string }
  | { type: "CONTEXT_SNAPSHOT"; seq: number; context_id: string; data: Record<string, unknown> }
  | { type: "PING"; seq: number; challenge: string }
  | { type: "STREAM_END"; seq: number; stream_id: string }
  | { type: "ERROR"; seq: number; code: string; message: string };

export type ClientMessage =
  | { type: "USER_MESSAGE"; content: string }
  | { type: "PONG"; echo: string }
  | { type: "RESUME"; last_seq: number }
  | { type: "TOOL_ACK"; call_id: string };

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface ChatBlockText {
  type: "text";
  content: string;
}

export interface ChatBlockTool {
  type: "tool";
  call_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export type ChatBlock = ChatBlockText | ChatBlockTool;

export interface AgentMessage {
  role: "agent";
  stream_id: string;
  blocks: ChatBlock[];
  isComplete: boolean;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export type ChatMessage = UserMessage | AgentMessage;

export type TraceEvent = 
  | ServerMessage 
  | { type: "TOKEN_GROUP"; stream_id: string; count: number; text: string; startTime: number; endTime: number };