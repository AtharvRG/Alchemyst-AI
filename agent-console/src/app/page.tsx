// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { connection } from "../lib/store";
import { Chat } from "../components/Chat";
import { Timeline } from "../components/Timeline";
import { ContextInspector } from "../components/ContextInspector";

export default function Home() {
  useEffect(() => {
    connection.connect();
    return () => connection.disconnect();
  }, []);

  return (
    <main className="h-screen w-screen flex overflow-hidden bg-gray-100">
      <div className="w-3/5 h-full">
        <Chat />
      </div>
      <div className="w-2/5 h-full flex flex-col">
        <div className="h-1/2">
          <Timeline />
        </div>
        <div className="h-1/2">
          <ContextInspector />
        </div>
      </div>
    </main>
  );
}