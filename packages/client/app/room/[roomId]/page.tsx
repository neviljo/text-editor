"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy load the editor to improve initial page load
const UnifiedEditorLayout = dynamic(
  () => import("@/components/UnifiedEditorLayout"),
  { ssr: false }
);

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className="h-screen w-full">
      <UnifiedEditorLayout roomId={roomId} />
    </div>
  );
}

