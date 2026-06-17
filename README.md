> I ackowledge the usage of AI for Assisted Coding & Evaluation  

# Alchemyst AI - Agent Console

## Architectural Summary
This application is built using Next.js (App Router) and Zustand for high-performance, outside-React-tree state management. The core of the system is the `AgentConnection` class—a custom WebSocket state machine that intercepts all incoming messages, handles immediate PING/PONG responses, deduplicates payloads, and buffers out-of-order sequences before flushing them to the UI. By decoupling the raw socket lifecycle from the React render cycle, the UI components subscribe only to specific state slices, ensuring 30+ tokens/sec rendering without layout shifts or DOM freezing, even under severe network chaos.

## WebSocket State Machine

```text
       +----------------------------------------------------+
       |                                                    |
       v                                                    |
[ Disconnected ] --(connect)--> [ Connecting ]              |
       ^                               |                    |
       |                           (onopen)                 |
       |                               |                    |
       |                               v                    |
       |                        [ Connected ] <--(Stream / Tool Calls)
       |                               |                    |
       |                            (drop)                  |
       |                               |                    |
       |                               v                    |
       +--(backoff timeout)-- [ Reconnecting ]              |
                                       |                    |
                               (socket restored)            |
                                       |                    |
                                       +--(Send RESUME)-----+
```

### Message Processing Pipeline
```text
Socket Receive -> Immediate PING/ACK -> Deduplicate (seq < expected) -> Buffer (seq > expected) -> Flush Sequential to UI
```

## Running the Application

**1. Start the Agent Server (Backend)**
Ensure Docker is installed and running.
```bash
cd agent-server
docker build -t agent-server .
docker run -p 4747:4747 agent-server --mode chaos
```

**2. Start the Agent Console (Frontend)**
Requires Node.js 20+.
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.


## Screen Recording
The mandatory chaos mode screen recording is included in the repository as `chaos-survival.mp4` or here: https://youtu.be/Cqqmugtsf4o
