// "use client";

// import "@blocknote/core/fonts/inter.css";
// import { useCreateBlockNote } from "@blocknote/react";
// import { BlockNoteView } from "@blocknote/mantine";
// import "@blocknote/mantine/style.css";

// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";

// export default function Editor() {
//   // Create a Yjs document
//   const doc = new Y.Doc();

//   // Connect to your Express + Yjs backend
//   const provider = new WebsocketProvider(
//     "ws://localhost:1234",    // your backend
//     "my-document-id",         // document/room id
//     doc
//   );

//   // Create the BlockNote editor with collaboration enabled
//   const editor = useCreateBlockNote({
//     collaboration: {
//       provider,
//       fragment: doc.getXmlFragment("document-store"),

//       user: {
//         name: "Nevil",
//         color: "#ff0000",
//       },

//       showCursorLabels: "always",
//     },
//   });

//   return <BlockNoteView editor={editor} />;
// }

// "use client";

// import "@blocknote/core/fonts/inter.css";
// import { useCreateBlockNote } from "@blocknote/react";
// import { BlockNoteView } from "@blocknote/mantine";
// import "@blocknote/mantine/style.css";
// import { userColor } from "@/utils/colors";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";

// export default function Editor({ roomId }: { roomId: string }) {
//   // Create a Yjs document for each editor instance
//   const doc = new Y.Doc();

//   // Connect to your Express + Yjs backend
//   const provider = new WebsocketProvider(
//     "ws://localhost:1234",
//     roomId,           // 🔥 dynamic room ID
//     doc
//   );

//   // Setup collaboration
//   const editor = useCreateBlockNote({
//     collaboration: {
//       provider,
//       fragment: doc.getXmlFragment("document-store"),

//       user: {
//         name: "Anonymous",   // ⚡ You can randomize later
//         color: userColor.color,
//       },

//       showCursorLabels: "always",
//     },
//   });

//   return <BlockNoteView editor={editor} />;
// }



"use client";

import { useEffect, useMemo, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { userColor } from "@/utils/colors";

export default function Editor({ roomId }: { roomId: string }) {
  // --- 1. Create Y.Doc once ---
  const ydoc = useMemo(() => new Y.Doc(), []);

  // --- 2. Track sync state ---
  const [isSynced, setIsSynced] = useState(false);
  const [readyToRender, setReadyToRender] = useState(false);

  // --- 3. Setup Undo Manager ---
  const undoManager = useMemo(() => {
    return new Y.UndoManager(ydoc.getXmlFragment("document-store"));
  }, [ydoc]);

  // --- 4. Setup provider ---
  const provider = useMemo(() => {
    const p = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:1234",
      roomId,
      ydoc
    );

    // Awareness: richer user info (same as excalidraw)
    // p.awareness.setLocalStateField("user", {
    //   name: "Anonymous",
    //   color: userColor.color,
    //   colorLight: userColor.light,
    // });

     p.awareness.setLocalState({
    user: {
      name: "Anonymous",
      color: userColor.color,
      colorLight: userColor.light,
      cursorColor: userColor.color,
    },
  });

    return p;
  }, [roomId, ydoc]);

  // --- 5. Sync listener with persisted-state detection ---
  useEffect(() => {
    const xml = ydoc.getXmlFragment("document-store");

    const handleSync = (synced: boolean) => {
      setIsSynced(synced);

      // If persisted data exists, render immediately
      if (xml.toString().length > 0) {
        setReadyToRender(true);
        return;
      }

      // Otherwise wait for updates
      let timeoutId: NodeJS.Timeout | null = null;

      const onUpdate = () => {
        if (xml.toString().length > 0) {
          setReadyToRender(true);
          cleanup();
        }
      };

      const cleanup = () => {
        try {
          ydoc.off("update", onUpdate);
        } catch {}
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
      };

      ydoc.on("update", onUpdate);

      timeoutId = setTimeout(() => {
        setReadyToRender(true); // Room empty → render
        cleanup();
      }, 400);
    };

    provider.on("sync", handleSync);

    return () => {
      provider.off("sync", handleSync);
      provider.destroy();
    };
  }, [provider, ydoc]);

  // --- 6. Debug logging like Excalidraw version (optional) ---
  useEffect(() => {
    const xml = ydoc.getXmlFragment("document-store");

    const logUpdate = () => {
      console.log("[Yjs Document Updated]", xml.toString());
    };

    ydoc.on("update", logUpdate);

    return () => ydoc.off("update", logUpdate);
  }, [ydoc]);

  // --- 7. Create BlockNote editor AFTER sync ---
  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: ydoc.getXmlFragment("document-store"),
      user: {
        name: "Anonymous",
        color: userColor.color,
        cursorColor: userColor.color,
      },
      showCursorLabels: "always",
    },
  });

  // --- 8. Do NOT render before sync ---
  if (!isSynced || !readyToRender) {
    return <div>Loading editor…</div>;
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


