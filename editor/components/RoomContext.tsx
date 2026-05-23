"use client";

import React, { createContext, useContext } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { CanvasProvider, useCanvas, roomIdToCanvasId } from "@/components/CanvasContext";

/**
 * RoomContext - Public API for room-based collaboration.
 * 
 * Internally delegates to CanvasContext for the actual implementation.
 * This maintains backward compatibility while allowing internal refactoring.
 */

interface RoomContextType {
    provider: WebsocketProvider | null;
    ydoc: Y.Doc;
    isSynced: boolean;
    userId?: string | null;
    accessDenied: boolean;
    connectionError: string | null;
}

const RoomContext = createContext<RoomContextType | null>(null);

/**
 * Hook to access room collaboration context.
 * This is the public API - components should use this hook.
 */
export function useRoom() {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error("useRoom must be used within a RoomProvider");
    }
    return context;
}

interface RoomProviderProps {
    roomId: string;
    userId?: string | null;
    children: React.ReactNode;
}

/**
 * Provider for room-based collaboration.
 * Internally maps roomId to canvasId and delegates to CanvasProvider.
 */
export function RoomProvider({
    roomId,
    userId,
    children,
}: RoomProviderProps) {
    // Map room ID to internal canvas ID (1:1 for now)
    const canvasId = roomIdToCanvasId(roomId);

    return (
        <CanvasProvider canvasId={canvasId} userId={userId}>
            <RoomContextBridge userId={userId}>
                {children}
            </RoomContextBridge>
        </CanvasProvider>
    );
}

/**
 * Internal bridge component that exposes CanvasContext values via RoomContext.
 * This allows existing components using useRoom() to work unchanged.
 */
function RoomContextBridge({
    userId,
    children,
}: {
    userId?: string | null;
    children: React.ReactNode;
}) {
    const { provider, ydoc, isSynced, accessDenied, connectionError } = useCanvas();

    const contextValue = React.useMemo(() => ({
        provider, ydoc, isSynced, userId, accessDenied, connectionError
    }), [provider, ydoc, isSynced, userId, accessDenied, connectionError]);

    return (
        <RoomContext.Provider value={contextValue}>
            {children}
        </RoomContext.Provider>
    );
}

