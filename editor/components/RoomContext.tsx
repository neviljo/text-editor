"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { userColor } from "@/utils/colors";

interface RoomContextType {
    provider: WebsocketProvider | null;
    ydoc: Y.Doc;
    isSynced: boolean;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function useRoom() {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error("useRoom must be used within a RoomProvider");
    }
    return context;
}

export function RoomProvider({
    roomId,
    children,
}: {
    roomId: string;
    children: React.ReactNode;
}) {
    const [isSynced, setIsSynced] = useState(false);

    // 1. Create the doc once
    const ydoc = useMemo(() => new Y.Doc(), []);

    // 2. Create the provider once
    const provider = useMemo(() => {
        if (!roomId) return null;

        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:1234";
        const p = new WebsocketProvider(wsUrl, roomId, ydoc);

        // Initial awareness setup
        p.awareness.setLocalStateField("user", {
            name: "Anonymous",
            color: userColor.color,
            colorLight: userColor.light,
        });

        p.on("sync", (synced: boolean) => {
            setIsSynced(synced);
            console.log(`[RoomProvider] Synced with room "${roomId}":`, synced);
        });

        return p;
    }, [roomId, ydoc]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (provider) {
                provider.destroy();
            }
        };
    }, [provider]);

    return (
        <RoomContext.Provider value={{ provider, ydoc, isSynced }}>
            {children}
        </RoomContext.Provider>
    );
}
