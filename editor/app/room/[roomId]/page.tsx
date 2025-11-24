"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;

  const Editor = dynamic(() => import("@/components/Editor"), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
  });

  const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
    ssr: false,
    loading: () => <p>Loading whiteboard...</p>,
  });

  async function handleCopyRoomId() {
    await navigator.clipboard.writeText(roomId);
    alert("Room ID copied");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex items-center justify-between p-2 bg-gray-900 text-white shrink-0">
        <p className="font-bold text-xl">Room ID: {roomId}</p>
        <button
          onClick={handleCopyRoomId}
          className="px-4 py-1 rounded-md text-sm border border-white hover:bg-white hover:text-black transition-colors"
        >
          Copy ID
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="w-1/2 h-full border-r border-gray-300 overflow-y-auto bg-white">
          <Editor roomId={roomId} />
        </div>

        {/* Whiteboard Panel */}
        <div className="w-1/2 h-full bg-gray-100">
          <Whiteboard roomId={roomId} />
        </div>
      </div>
    </div>
  );
}
