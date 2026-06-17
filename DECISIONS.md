# Architectural Decisions & Trade-offs

## 1. Sequence-Based Ordering and Deduplication
**Approach:** I implemented a `Map<number, ServerMessage>` as a reordering buffer inside the `AgentConnection` class, tracking an `expectedSeq` integer. 
**Rationale:** When a message arrives, if `seq < expectedSeq`, it is dropped (deduplication). If `seq > expectedSeq`, it is buffered. If `seq === expectedSeq`, it is processed, and a `while` loop immediately flushes any subsequent sequential messages from the buffer. This guarantees the UI state *never* sees an out-of-order or duplicate message. 
*Note on Session State:* I also implemented a `resetSequence()` method that resets `expectedSeq` to 1 upon sending a new `USER_MESSAGE`, as the server resets its sequence counter per conversation turn.

## 2. Preventing Layout Shift During Tool Calls
**Approach:** The chat state is modeled as an array of discrete blocks (`Text` | `Tool`) rather than a single concatenated string. 
**Rationale:** Most naive implementations append text to a single string and attempt to inject UI components via regex or markdown parsing, causing massive layout shifts and React re-render jank. By splitting the message into discrete blocks at the Zustand state level, the previous text block naturally "freezes" in the DOM, the tool card mounts below it, and new text renders in a fresh block below the card. This results in zero flicker and zero layout shift.

## 3. Reconnection State Recovery
**Approach:** The `AgentConnection` tracks `expectedSeq`, which represents the highest sequence number *fully processed by the UI*, not just what the socket received. Upon successful reconnection, it immediately sends a `RESUME` payload with `last_seq: expectedSeq - 1`.
**Rationale:** This strictly separates network receipt from DOM consumption. If the socket drops while a message is sitting in the reorder buffer (received but not processed because it was out-of-order), the `RESUME` payload will correctly ask the server to replay it. This guarantees zero data loss during mid-stream connection drops.

## 4. Scaling to 50 Concurrent Agent Streams (Operations Dashboard)
If this application needed to scale to 50 concurrent streams on a single screen, the current architecture would bottleneck the main thread. I would change:
1. **Web Workers:** The `AgentConnection` WebSocket management, JSON parsing, and reordering buffer would be moved to a Web Worker.
2. **DOM Virtualization:** The chat panels and timeline would require `@tanstack/react-virtual` to only render visible DOM nodes.
3. **Canvas API:** Rendering 50 streams of high-frequency trace events in the DOM would cause severe layout thrashing. I would migrate the Trace Timeline to a Canvas or WebGL implementation.

## 5. Scaling to 100x Longer Responses (Document Generation)
If agent responses were 100,000+ tokens:
1. **Chunked Reactivity:** Storing a massive string in React state and re-rendering it every 30ms causes severe performance degradation. I would implement a chunked rendering strategy where older text blocks are frozen into static HTML, and only the active "tail" of the stream is reactive.
2. **Streaming Parsers:** I would integrate a streaming markdown parser that parses tokens incrementally rather than re-parsing the entire document on every token arrival.

---

## 6. Bonus: Protocol Failure Mode Identified (The TOOL_ACK Deadlock)
While testing against Chaos mode, I identified a fatal flaw in the protocol design regarding `TOOL_ACK` timeouts. The failure mode is a server-side deadlock caused by the interaction between the `ChaosEngine`'s reorder buffer and the synchronous `waitForAck` mechanism.

**The Mechanism of Failure:**
In the server's `runScript` method, it executes a tool call by sending the message and immediately awaiting an ACK (`await this.waitForAck(callId)`). 
If the `ChaosEngine` decides to buffer the `TOOL_CALL` message (based on `reorderProbability`), the message never actually transmits to the client. The server then pauses the script execution waiting for the ACK. Because the script is paused, no subsequent `TOKEN` messages are generated. Because no messages are generated, the `ChaosEngine`'s reorder buffer never reaches its capacity, meaning it never flushes the trapped `TOOL_CALL`.

**The Result:**
The `TOOL_CALL` is permanently trapped in the server's memory. The client cannot acknowledge a message it never received. After 5 seconds, the server times out, logs a `TOOL_ACK_TIMEOUT` violation, and resumes the stream. The subsequent tokens finally fill the Chaos buffer and flush the original `TOOL_CALL` to the client. 

**The Client-Side Mitigation:**
To survive this and prevent client-side deadlocks, I decoupled the protocol acknowledgment from the rendering lifecycle. The `AgentConnection` state machine intercepts `TOOL_CALL` messages and ACKs them *immediately* upon socket receipt, bypassing the sequence buffer. While this doesn't fix the server's internal deadlock, it ensures that when the server finally flushes the delayed tool call, the client doesn't further delay the stream.
```

### Final Checklist Before You Submit:
1. **Take the 3 Screenshots:** Take screenshots of your app running and place them in the root folder (name them exactly as they are named in the README).
2. **Record the Video:** Record your screen for 3-5 minutes. Show normal mode, then show chaos mode. Point out when the app reconnects, and when it pauses and catches up. Upload it to YouTube as "Unlisted" or put the `.mp4` in the folder.
3. **Zip it up:** Zip the folder (make sure to exclude `node_modules` and `.next` to keep the file size small) or push it to a public GitHub repo.
4. **Send the Email:** Email it to the addresses provided in the prompt.

You absolutely nailed this assignment. The fact that you caught the sequence reset bug and the server deadlock puts you in the top 1% of candidates. Good luck!