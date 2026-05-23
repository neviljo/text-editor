"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { userColor } from "@/utils/colors";
import { config } from "@/utils/config";

/**
 * Internal Canvas Context - the scalable ownership-based abstraction.
 * Externally, components should use RoomContext for backward compatibility.
 */

export interface CanvasContextType {
    provider: WebsocketProvider | null;
    ydoc: Y.Doc;
    isSynced: boolean;
    canvasId: string;
    userId?: string | null;
    accessDenied: boolean;
    connectionError: string | null;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

/**
 * Internal hook to access canvas context.
 * For external use, prefer useRoom() from RoomContext.tsx
 */
export function useCanvas() {
    const context = useContext(CanvasContext);
    if (!context) {
        throw new Error("useCanvas must be used within a CanvasProvider");
    }
    return context;
}

/**
 * Map a room ID to its internal canvas ID.
 * Currently 1:1 mapping for backward compatibility.
 */
export function roomIdToCanvasId(roomId: string): string {
    return roomId;
}

/**
 * Map a canvas ID back to its public room ID.
 * Currently 1:1 mapping for backward compatibility.
 */
export function canvasIdToRoomId(canvasId: string): string {
    return canvasId;
}

interface CanvasProviderProps {
    canvasId: string;
    userId?: string | null;
    children: React.ReactNode;
}

export function CanvasProvider({
    canvasId,
    userId,
    children,
}: CanvasProviderProps) {
    const [isSynced, setIsSynced] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // 1. Create the doc once
    const ydoc = useMemo(() => new Y.Doc(), []);

    // 2. Create the provider once
    const provider = useMemo(() => {
        if (!canvasId) return null;

        // Only reconnect if canvasId changes. UserId change shouldn't force reconnect
        // unless strictly necessary for permissions, but usually auth token handles that.
        // If we really need userId in query param, we should ensure it's stable.
        const wsUrl = config.websocketUrl;

        // Append all params including userId if available
        const url = new URL(wsUrl);
        if (userId) url.searchParams.set("userId", userId);

        const p = new WebsocketProvider(url.toString(), canvasId, ydoc);

        // Initial awareness setup
        p.awareness.setLocalStateField("user", {
            name: "Anonymous",
            color: userColor.color,
            colorLight: userColor.light,
        });

        return p;
        // userId removed from dependency array to prevent reconnect on auth refresh
        // canvasId is the main identity of the connection
    }, [canvasId, ydoc]);

    // Handle WebSocket close events for access denial
    const handleClose = useCallback((event: CloseEvent) => {
        if (event.code === 4403) {
            setAccessDenied(true);
            setConnectionError("Access denied");
            console.log(`[CanvasProvider] Access denied to canvas "${canvasId}"`);
        } else if (event.code === 4500) {
            setConnectionError("Connection error");
            console.error(`[CanvasProvider] Connection error for canvas "${canvasId}"`);
        }
    }, [canvasId]);

    // Set up WebSocket close event listener
    useEffect(() => {
        if (!provider) return;

        const ws = provider.ws;
        if (ws) {
            ws.addEventListener("close", handleClose);
        }

        // Also listen for future WebSocket connections (reconnects)
        const checkWs = () => {
            if (provider.ws) {
                provider.ws.addEventListener("close", handleClose);
            }
        };

        // y-websocket may recreate WebSocket on reconnect
        provider.on("status", checkWs);

        return () => {
            if (ws) {
                ws.removeEventListener("close", handleClose);
            }
            provider.off("status", checkWs);
        };
    }, [provider, handleClose]);

    // Set up sync event listener in useEffect (not during render)
    useEffect(() => {
        if (!provider) return;

        const handleSync = (synced: boolean) => {
            setIsSynced(synced);
            console.log(`[CanvasProvider] Synced with canvas "${canvasId}":`, synced);
        };

        provider.on("sync", handleSync);

        // Check if already synced (in case sync happened before effect ran)
        if (provider.synced) {
            setIsSynced(true);
        }

        return () => {
            provider.off("sync", handleSync);
        };
    }, [provider, canvasId]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (provider) {
                provider.destroy();
            }
        };
    }, [provider]);

    const contextValue = useMemo(() => ({
        provider, ydoc, isSynced, canvasId, userId, accessDenied, connectionError
    }), [provider, ydoc, isSynced, canvasId, userId, accessDenied, connectionError]);

    return (
        <CanvasContext.Provider value={contextValue}>
            {children}
        </CanvasContext.Provider>
    );
}
