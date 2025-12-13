"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { RoomProvider } from "@/components/RoomContext";

type ViewMode = "canvas" | "document" | "both";

const Editor = dynamic(() => import("@/components/Editor"), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
});

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
    ssr: false,
    loading: () => <p>Loading whiteboard...</p>,
});

interface UnifiedEditorLayoutProps {
    roomId: string; // If empty string, runs in isolated Demo mode (local only)
    showHeader?: boolean; // Option to hide the header for cleaner demo look
    className?: string;
}

export default function UnifiedEditorLayout({ roomId, showHeader = true, className = "" }: UnifiedEditorLayoutProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("both");
    const [splitRatio, setSplitRatio] = useState(50); // Percentage for document panel
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    async function handleCopyRoomId() {
        await navigator.clipboard.writeText(roomId);
        alert("Room ID copied");
    }

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

        // Constrain between 20% and 80%
        const constrainedRatio = Math.min(Math.max(newRatio, 20), 80);
        setSplitRatio(constrainedRatio);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        } else {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isDragging]);

    return (
        <div className={`flex flex-col h-full overflow-hidden ${className}`}>
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between p-2 bg-gray-900 text-white shrink-0">
                    <p className="font-bold text-xl">Room ID: {roomId || "Demo Mode"}</p>

                    {/* View Mode Selector */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode("document")}
                            className={`px-4 py-1 rounded-md text-sm transition-colors ${viewMode === "document"
                                ? "bg-white text-black"
                                : "border border-white hover:bg-white hover:text-black"
                                }`}
                        >
                            Document
                        </button>
                        <button
                            onClick={() => setViewMode("canvas")}
                            className={`px-4 py-1 rounded-md text-sm transition-colors ${viewMode === "canvas"
                                ? "bg-white text-black"
                                : "border border-white hover:bg-white hover:text-black"
                                }`}
                        >
                            Canvas
                        </button>
                        <button
                            onClick={() => setViewMode("both")}
                            className={`px-4 py-1 rounded-md text-sm transition-colors ${viewMode === "both"
                                ? "bg-white text-black"
                                : "border border-white hover:bg-white hover:text-black"
                                }`}
                        >
                            Both
                        </button>
                    </div>

                    <button
                        onClick={handleCopyRoomId}
                        disabled={!roomId}
                        className="px-4 py-1 rounded-md text-sm border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Copy ID
                    </button>
                </div>
            )}

            {/* Content Area */}
            <RoomProvider roomId={roomId}>
                <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
                    {/* Document Panel */}
                    <div
                        className="absolute top-0 left-0 h-full border-r border-gray-300 overflow-y-auto bg-white transition-all"
                        style={{
                            width: viewMode === "both" ? `${splitRatio}%` : "100%",
                            visibility: viewMode === "canvas" ? "hidden" : "visible",
                            zIndex: viewMode === "document" ? 2 : 1,
                        }}
                    >
                        <Editor roomId={roomId} />
                    </div>

                    {/* Draggable Divider */}
                    {viewMode === "both" && (
                        <div
                            onMouseDown={handleMouseDown}
                            className="absolute top-0 h-full w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors group z-10"
                            style={{
                                left: `${splitRatio}%`,
                                flexShrink: 0
                            }}
                        >
                            {/* Visual indicator */}
                            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500/20" />
                        </div>
                    )}

                    {/* Canvas Panel */}
                    <div
                        className="absolute top-0 right-0 h-full bg-gray-100 transition-all"
                        style={{
                            width: viewMode === "both" ? `${100 - splitRatio}%` : "100%",
                            visibility: viewMode === "document" ? "hidden" : "visible",
                            zIndex: viewMode === "canvas" ? 2 : 1,
                        }}
                    >
                        <Whiteboard roomId={roomId} />
                    </div>
                </div>
            </RoomProvider>
        </div>
    );
}
