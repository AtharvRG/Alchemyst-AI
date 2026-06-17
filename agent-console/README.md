# Alchemyst AI - Agent Console

## Architecture Summary
This application is built with Next.js (App Router) and Zustand. The core of the system is the `AgentConnection` class, a custom WebSocket state machine that sits outside the React render tree. It intercepts all incoming messages, handles immediate PING/PONG responses, deduplicates messages, and buffers out-of-order sequences before flushing them to the Zustand store. The UI components subscribe only to the specific slices of state they need, ensuring 30+ tokens/sec rendering without layout shifts or DOM freezing.

## State Machine Diagram
```text
[Disconnected] ---> (connect) ---> [Connecting]
                                        |
                                    (onopen)
                                        |
                                        v
[Reconnecting] <--- (drop) ------- [Connected] <-------> (Streaming / Tool Calls)
      |                                 |
      |                                 v
      +---- (backoff timeout) ----> (Send RESUME)