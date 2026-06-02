"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { ExcalidrawBinding, yjsToExcalidraw } from "y-excalidraw";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useCollaboration } from "@/components/CollaborationContext";
import { useHandleLibrary } from "@excalidraw/excalidraw";

interface ExcalidrawElementEntry {
    el: NonDeletedExcalidrawElement;
    pos: string;
}

const Excalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
    { ssr: false }
);

export default function Whiteboard({ roomId: _roomId }: { roomId: string }) {
    const { provider, ydoc, isSynced } = useCollaboration();
    const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
    const [binding, setBinding] = useState<ExcalidrawBinding | null>(null);
    const excalidrawRef = useRef(null);

    const yElements = useMemo(
        () => ydoc.getArray<Y.Map<ExcalidrawElementEntry>>("elements"),
        [ydoc]
    ); // structure = {el: NonDeletedExcalidrawElement, pos: string}
    const yAssets = useMemo(() => ydoc.getMap("assets"), [ydoc]);

    useHandleLibrary({ excalidrawAPI: api });

    const existingBindingRef = useRef<ExcalidrawBinding | null>(null);

    useEffect(() => {
        if (!api || !excalidrawRef.current || !provider) return;

        if (existingBindingRef.current) return;

        const newBinding = new ExcalidrawBinding(
            yElements,
            yAssets,
            api,
            provider.awareness,
            {
                excalidrawDom: excalidrawRef.current,
                undoManager: new Y.UndoManager([yElements, yAssets]),
            }
        );

        setBinding(newBinding);
        existingBindingRef.current = newBinding;

        return () => {
            newBinding.destroy();
            existingBindingRef.current = null;
        };
    }, [api, provider, yElements, yAssets]);

    const initData = {
        elements: yjsToExcalidraw(yElements),
    };

    // ❌ REMOVED: Expensive debug code that was causing performance issues
    // This observeDeep + JSON.stringify on every change was freezing the app
    // For debugging, use React DevTools or targeted logging instead

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

    // Wait for sync before rendering to prevent empty canvas from overwriting saved data
    if (!provider || !isSynced) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Syncing canvas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full" ref={excalidrawRef}>
            <Excalidraw
                initialData={initData} // Set initial data only after sync
                excalidrawAPI={setApi}
                onPointerUpdate={binding?.onPointerUpdate || undefined}
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
