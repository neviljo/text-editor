"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/utils/config";

import { useAuth } from "@clerk/nextjs";

const RoomComponent = () => {
  const [roomId, setRoomId] = useState("");
  const { userId } = useAuth();

  const [createRoomLoading, setCreateRoomLoading] = useState<boolean>(false);
  const [joinRoomLoading, setJoinRoomLoadingLoading] = useState<boolean>(false);

  const router = useRouter();

  // const generateRoomId = () => {
  //   const id = Math.random().toString(36).substring(2, 15);
  //   setRoomId(id);
  // };

  const joinRoom = () => {
    setJoinRoomLoadingLoading(true);

    if (roomId.trim()) {
      startTransition(() => {
        router.push(`/room/${roomId.trim()}`);
      });
    } else {
      alert("Enter a roomId");
    }
  };

  const createRoom = async () => {
    setCreateRoomLoading(true);
    try {
      const res = await fetch(`${config.httpUrl}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: userId }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const data = await res.json();

      startTransition(() => {
        router.push(`/room/${data.roomId}`);
      });
    } catch (err) {
      console.error("Failed to create room:", err);
      alert("Failed to create room. Falling back to local ID.");
      // Fallback
      const id = Math.random().toString(36).substring(2, 15);
      startTransition(() => {
        router.push(`/room/${id}`);
      });
    }
  };

  return (
    <main className="h-full bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-center !my-8 !text-black">
          Collaborative Whiteboard
        </h1>

        <div className="space-y-6">
          <div>
            <button
              onClick={createRoom}
              disabled={createRoomLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-pointer disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {createRoomLoading ? "Creating room..." : "Create New Room"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="flex-1 px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
            </div>
            <button
              onClick={joinRoom}
              disabled={!roomId.trim() || joinRoomLoading}
              className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {joinRoomLoading ? "Connecting..." : "Join room"}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Share the room ID with others to collaborate in real-time!</p>
        </div>
      </div>
    </main>
  );
};

export default RoomComponent;
