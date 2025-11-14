"use client";

import RoomComponent from "@/components/RoomComponent";

export default function Home() {
  return (
    <div className="w-full h-dvh flex flex-col">
      <h1 className="text-center text-4xl my-4">Whiteboard</h1>
      <div className="grow">
        <RoomComponent />
      </div>
    </div>
  );
}

