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

  // --- 3. Do NOT render before sync ---
  // Removed blocking check for optimistic loading
  // if (!provider || !isSynced) {
  //   return <div>Loading editor…</div>;
  // }

  return (
    <div className="w-full">
      <BlockNoteView
        editor={editor}
        theme="light"
      />
    </div>
  );
}