"use client";

import { useParams } from "next/navigation";
import UnifiedEditorLayout from "@/components/UnifiedEditorLayout";

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className="h-screen w-full">
      <UnifiedEditorLayout roomId={roomId} />
    </div>
  );
}

