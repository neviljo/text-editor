"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { ExcalidrawBinding, yjsToExcalidraw } from "y-excalidraw";
import { WebsocketProvider } from "y-websocket";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import debounce from "../utils/debounce";
import { userColor } from "@/utils/colors";
import { useHandleLibrary } from "@excalidraw/excalidraw";

interface ExcalidrawElementEntry {
    el: NonDeletedExcalidrawElement;
    pos: string;
}

const Excalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
    { ssr: false }
);

export default function Whiteboard({ roomId }: { roomId: string }) {
    const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
    const [binding, setBindings] = useState<ExcalidrawBinding | null>(null);
    const [isSynced, setIsSynced] = useState(false); // Track Yjs sync status
    const [readyToRender, setReadyToRender] = useState(false); // ensure we know if persisted state exists before mounting Excalidraw
    const excalidrawRef = useRef(null);
    const providerRef = useRef<WebsocketProvider | null>(null);

    const ydoc = useMemo(() => new Y.Doc(), []);
    const yElements = useMemo(
        () => ydoc.getArray<Y.Map<ExcalidrawElementEntry>>("elements"),
        [ydoc]
    ); // structure = {el: NonDeletedExcalidrawElement, pos: string}
    const yAssets = useMemo(() => ydoc.getMap("assets"), [ydoc]);

    useEffect(() => {
        providerRef.current = new WebsocketProvider(
            process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:1234",
            roomId,
            ydoc
        );

        providerRef.current.awareness.setLocalStateField("user", {
            name: "Anonymous",
            color: userColor.color,
            colorLight: userColor.light,
        });

        // Listen for sync event and update state
        providerRef.current.on("sync", (isSynced: boolean) => {
            setIsSynced(isSynced);
            console.log(`[provider] Synced with room "${roomId}":`, isSynced);

            // If there is already content, render immediately.
            if (yElements.length > 0) {
                setReadyToRender(true);
                return;
            }

            // Otherwise wait briefly for an incoming persisted update to arrive.
            // If a non-empty persisted update arrives, we'll render with it.
            // If nothing arrives within the timeout, assume room is empty and render.
            let timeoutId: NodeJS.Timeout | null = null;
            const onDocUpdate = () => {
                const elements = yjsToExcalidraw(yElements);
                if (elements && elements.length > 0) {
                    setReadyToRender(true);
                    cleanup();
                }
            };

            const cleanup = () => {
                try {
                    ydoc.off("update", onDocUpdate);
                } catch { }
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            ydoc.on("update", onDocUpdate);
            timeoutId = setTimeout(() => {
                // after wait, render anyway (room truly empty)
                setReadyToRender(true);
                cleanup();
            }, 500); // 500ms is a safe small window; increase if your network/DB is slow
        });

        // Cleanup on unmount
        return () => {
            if (providerRef?.current) {
                providerRef.current?.destroy();
                providerRef.current = null;
            }
        };
    }, [roomId, ydoc, yElements]);

    useHandleLibrary({ excalidrawAPI: api });

    useEffect(() => {
        // renders library items in the same tab instead of another
        window.name = roomId;
    }, [roomId]);

    useEffect(() => {
        if (!api || !excalidrawRef.current) return;

        const binding = new ExcalidrawBinding(
            yElements,
            yAssets,
            api,
            providerRef?.current?.awareness,
            {
                excalidrawDom: excalidrawRef?.current,
                undoManager: new Y.UndoManager([yElements, yAssets]),
            }
        );
        setBindings(binding);

        return () => {
            setBindings(null);
            binding.destroy();
        };
    }, [api, yElements, yAssets]);

    const initData = {
        elements: yjsToExcalidraw(yElements),
    };

    useEffect(() => {
        let lastSerialized = "";

        const logElements = debounce(() => {
            const current = yElements.toArray().map((item) => item.toJSON());
            const serialized = JSON.stringify(current);

            if (serialized !== lastSerialized) {
                lastSerialized = serialized;
                console.log("ELEMENTS", current);
            }
        }, 1500);
        yElements.observeDeep(logElements);

        return () => {
            yElements.unobserveDeep(logElements);
        };
    }, [yElements]);

    useEffect(() => {
        // When api + binding are ready, push the Y state into Excalidraw so Excalidraw doesn't emit
        // an empty scene and overwrite the Y.Doc.
        if (!api || !binding) return;

        // derive elements from Y state and update Excalidraw scene only if there are elements
        const elements = yjsToExcalidraw(yElements);
        if (elements && elements.length > 0) {
            try {
                api.updateScene({ elements });
            } catch (err) {
                console.error("Failed to update Excalidraw scene from Y state:", err);
            }
        }
    }, [api, binding, yElements]);

    // Only render Excalidraw when the Yjs document is synced (prevents empty board on refresh)
    if (!isSynced || !readyToRender) {
        return <div>Loading whiteboard...</div>;
    }

    return (
        <div className="w-full h-full" ref={excalidrawRef}>
            <Excalidraw
                initialData={initData} // Set initial data only after sync
                excalidrawAPI={setApi}
                onPointerUpdate={binding?.onPointerUpdate}
                theme="dark"
                UIOptions={{
                    canvasActions: {
                        toggleTheme: true,
                        saveAsImage: true,
                        loadScene: true,
                    },
                }}
            />
        </div>
    );
}
