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

  async function handleCopyRoomId() {
    await navigator.clipboard.writeText(roomId);
    alert("Room ID copied");
  }

  return (
    <>
      <div className="flex items-center justify-center p-2 gap-4">
        <p className="font-bold text-white text-xl">Room ID: {roomId}</p>
        <button
          onClick={handleCopyRoomId}
          className="px-4 py-2 rounded-md text-white border border-white"
        >
          Copy
        </button>
      </div>

      <Editor roomId={roomId} />
    </>
  );
}
