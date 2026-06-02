"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CollaborationProvider, useCollaboration } from "@/components/CollaborationContext";
import { useAuth } from "@clerk/nextjs";
import AuthControl from "./AuthControl";

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

/**
 * Access denied view - shown when user doesn't have permission to access the canvas.
 */
function AccessDeniedView() {
    return (
        <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-6">
                    You don&apos;t have permission to access this canvas.
                    Please sign in or ask the owner for access.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/join"
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Go Back
                    </Link>
                    <AuthControl />
                </div>
            </div>
        </div>
    );
}

/**
 * Content wrapper that checks for access denial.
 */
function ContentWithAccessCheck({
    roomId,
    viewMode,
    splitRatio,
    handleMouseDown,
    containerRef,
}: {
    roomId: string;
    viewMode: ViewMode;
    splitRatio: number;
    handleMouseDown: () => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { accessDenied, provider } = useCollaboration();

    if (accessDenied) {
        return <AccessDeniedView />;
    }

    return (
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
                {provider && <Editor key={`editor-${roomId}`} roomId={roomId} />}
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
                {provider && <Whiteboard key={`whiteboard-${roomId}`} roomId={roomId} />}
            </div>
        </div>
    );
}

export default function UnifiedEditorLayout({ roomId, showHeader = true, className = "" }: UnifiedEditorLayoutProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("both");
    const [splitRatio, setSplitRatio] = useState(50); // Percentage for document panel
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { userId } = useAuth();

    async function handleCopyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
        } catch {
            // Clipboard write failed - silently ignore
        }
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
                <div className="flex items-center justify-between p-2 bg-gray-900 text-white shrink-0 gap-4">
                    <div className="flex items-center gap-4">
                        <p className="font-bold text-xl">Room ID: {roomId || "Demo Mode"}</p>
                    </div>

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
                    <AuthControl />
                </div>
            )}

            {/* Content Area */}
            <CollaborationProvider roomId={roomId} userId={userId}>
                <ContentWithAccessCheck
                    roomId={roomId}
                    viewMode={viewMode}
                    splitRatio={splitRatio}
                    handleMouseDown={handleMouseDown}
                    containerRef={containerRef}
                />
            </CollaborationProvider>
        </div>
    );
}
