"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { ExcalidrawBinding, yjsToExcalidraw } from "y-excalidraw";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import debounce from "../utils/debounce";
import { useRoom } from "@/components/RoomContext";
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
    const { provider, ydoc, isSynced } = useRoom();
    const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
    const [binding, setBindings] = useState<ExcalidrawBinding | null>(null);
    const excalidrawRef = useRef(null);

    const yElements = useMemo(
        () => ydoc.getArray<Y.Map<ExcalidrawElementEntry>>("elements"),
        [ydoc]
    ); // structure = {el: NonDeletedExcalidrawElement, pos: string}
    const yAssets = useMemo(() => ydoc.getMap("assets"), [ydoc]);

    useHandleLibrary({ excalidrawAPI: api });

    useEffect(() => {
        // renders library items in the same tab instead of another
        window.name = roomId;
    }, [roomId]);

    useEffect(() => {
        if (!api || !excalidrawRef.current || !provider) return;

        const binding = new ExcalidrawBinding(
            yElements,
            yAssets,
            api,
            provider.awareness,
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
    }, [api, yElements, yAssets, provider]);

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
    // Removed blocking check for optimistic loading
    // if (!provider || !isSynced) {
    //     return <div>Loading whiteboard...</div>;
    // }

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
