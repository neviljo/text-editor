"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { userColor } from "@/utils/colors";
import { config } from "@/utils/config";

export interface CollaborationContextType {
    provider: WebsocketProvider | null;
    ydoc: Y.Doc;
    isSynced: boolean;
    roomId: string;
    userId?: string | null;
    accessDenied: boolean;
    connectionError: string | null;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration() {
    const context = useContext(CollaborationContext);
    if (!context) {
        throw new Error("useCollaboration must be used within a CollaborationProvider");
    }
    return context;
}

interface CollaborationProviderProps {
    roomId: string;
    userId?: string | null;
    children: React.ReactNode;
}

export function CollaborationProvider({
    roomId,
    userId,
    children,
}: CollaborationProviderProps) {
    const [isSynced, setIsSynced] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const ydoc = useMemo(() => new Y.Doc(), []);

    const provider = useMemo(() => {
        if (!roomId) return null;

        const wsUrl = config.websocketUrl;
        const url = new URL(wsUrl);
        if (userId) {
            url.searchParams.set("userId", userId);
        }

        return new WebsocketProvider(url.toString(), roomId, ydoc);
    }, [roomId, ydoc, userId]);

    useEffect(() => {
        if (!provider) return;
        provider.awareness.setLocalStateField("user", {
            name: userId ? `User ${userId.slice(0, 6)}` : "Anonymous",
            color: userColor.color,
            colorLight: userColor.light,
        });
    }, [provider, userId]);

    const handleClose = useCallback((event: CloseEvent) => {
        if (event.code === 4403) {
            setAccessDenied(true);
            setConnectionError("Access denied");
        } else if (event.code === 4500) {
            setConnectionError("Connection error");
        }
    }, []);

    useEffect(() => {
        if (!provider) return;

        const ws = provider.ws;
        if (ws) {
            ws.addEventListener("close", handleClose);
        }

        const checkWs = () => {
            if (provider.ws) {
                provider.ws.addEventListener("close", handleClose);
            }
        };

        provider.on("status", checkWs);

        return () => {
            if (ws) {
                ws.removeEventListener("close", handleClose);
            }
            provider.off("status", checkWs);
        };
    }, [provider, handleClose]);

    useEffect(() => {
        if (!provider) return;

        const handleSync = (synced: boolean) => {
            setIsSynced(synced);
        };

        provider.on("sync", handleSync);

        if (provider.synced) {
            const id = setTimeout(() => setIsSynced(true), 0);
            return () => {
                clearTimeout(id);
                provider.off("sync", handleSync);
            };
        }

        return () => {
            provider.off("sync", handleSync);
        };
    }, [provider]);

    useEffect(() => {
        return () => {
            if (provider) {
                provider.destroy();
            }
            ydoc.destroy();
        };
    }, [provider, ydoc]);

    const contextValue = useMemo(() => ({
        provider, ydoc, isSynced, roomId, userId, accessDenied, connectionError
    }), [provider, ydoc, isSynced, roomId, userId, accessDenied, connectionError]);

    return (
        <CollaborationContext.Provider value={contextValue}>
            {children}
        </CollaborationContext.Provider>
    );
}
