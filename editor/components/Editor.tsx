"use client";

import { useEffect, useMemo, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "yjs";
import { userColor } from "@/utils/colors";
import { useRoom } from "@/components/RoomContext";

export default function Editor({ roomId }: { roomId: string }) {
  const { provider, ydoc, isSynced } = useRoom();

  // --- 1. Generate consistent user info ---
  const userInfo = useMemo(() => ({
    name: "Anonymous",
    color: userColor.color,
    colorLight: userColor.light,
  }), []);

  // --- 2. Create BlockNote editor only when provider is available ---
  const editor = useCreateBlockNote({
    collaboration: provider ? {
      provider,
      fragment: ydoc.getXmlFragment("document-store"),
      user: {
        name: userInfo.name,
        color: userInfo.color,
      },
    } : undefined,
  });

  // Wait for provider and sync before rendering to prevent data loss
  if (!provider || !isSynced) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <BlockNoteView
        editor={editor}
        theme="light"
      />
    </div>
  );
}