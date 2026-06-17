// src/lib/AgentConnection.ts
import { ServerMessage, ClientMessage, ConnectionState } from "./types";

export class AgentConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private expectedSeq = 1;
  private buffer = new Map<number, ServerMessage>();
  
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  public onMessage?: (msg: ServerMessage) => void;
  public onStateChange?: (state: ConnectionState) => void;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.onStateChange?.(this.isReconnecting ? "reconnecting" : "connecting");
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.onStateChange?.("connected");

      // State Recovery: Send RESUME if we have processed messages previously
      if (this.expectedSeq > 1) {
        this.send({ type: "RESUME", last_seq: this.expectedSeq - 1 });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        this.handleRawMessage(msg);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    this.ws.onclose = () => this.handleDrop();
    this.ws.onerror = () => this.handleDrop();
  }

  private handleDrop() {
    if (this.reconnectTimeout) return; // Already backing off
    
    this.ws = null;
    this.isReconnecting = true;
    this.onStateChange?.("reconnecting");

    // Exponential backoff: 500ms, 1s, 2s, 4s, capped at 10s
    const backoff = Math.min(10000, 500 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, backoff);
  }

  private handleRawMessage(msg: ServerMessage) {
    // 1. Handle PING immediately to ensure we don't miss the 3s window
    if (msg.type === "PING") {
      this.send({ type: "PONG", echo: msg.challenge || "" }); 
    }

    // 2. BREAK THE DEADLOCK: Send TOOL_ACK immediately upon receipt!
    // If we wait for the sequence buffer to render it, and a previous token is 
    // trapped in the server's chaos reorder buffer, the server will pause the stream 
    // waiting for this ACK, causing a permanent deadlock until the 5s timeout.
    if (msg.type === "TOOL_CALL") {
      this.send({ type: "TOOL_ACK", call_id: msg.call_id });
    }

    // 3. Deduplication
    if (msg.seq < this.expectedSeq) return;

    // 4. Buffer out-of-order messages
    this.buffer.set(msg.seq, msg);
    this.processBuffer();
  }

  private processBuffer() {
    // 5. Process messages strictly in sequence order
    while (this.buffer.has(this.expectedSeq)) {
      const msg = this.buffer.get(this.expectedSeq)!;
      this.buffer.delete(this.expectedSeq);
      this.onMessage?.(msg);
      this.expectedSeq++;
    }
  }

public resetSequence() {
		this.expectedSeq = 1;
		this.buffer.clear();
	}
	send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
    this.ws = null;
    this.onStateChange?.("disconnected");
  }
}