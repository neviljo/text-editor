"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface CollabContextType {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
}

export const CollabContext = createContext<CollabContextType | null>(null);

// 1. THE INNER COMPONENT
// This handles the lifecycle of a SINGLE room connection.
function Room({ roomId, children }: { roomId: string; children: ReactNode }) {
  
  // ✅ FIX: Initialize inside useState function. 
  // This runs once during the initial render. No "setState" needed -> No error.
  const [collabState] = useState<CollabContextType>(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL!,
      roomId,
      ydoc
    );
    return { ydoc, provider };
  });

  // ✅ CLEANUP: Destroy connection when component unmounts
  useEffect(() => {
    return () => {
      collabState.provider.destroy();
      collabState.ydoc.destroy();
    };
  }, []); // Empty dependency array because 'collabState' is stable

  return (
    <CollabContext.Provider value={collabState}>
      {children}
    </CollabContext.Provider>
  );
}

// 2. THE WRAPPER COMPONENT
// This handles destroying the old room and creating a new one when roomId changes.
export function CollabProvider({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  return (
    // React uses the 'key' to decide when to unmount the old component 
    // and mount a fresh one. This ensures proper cleanup of the WebSocket.
    <Room key={roomId} roomId={roomId}>
      {children}
    </Room>
  );
}