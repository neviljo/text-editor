import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import * as Y from "yjs";
import { setPersistence, setupWSConnection } from "@y/websocket-server/utils";
import { MongodbPersistence } from "y-mongodb-provider";
import mongoose from "mongoose";
import cors from "cors";
import {
  createCanvasForRoom,
  addCollaborator,
  deleteCanvas,
  updateCanvas,
} from "./services/canvasService.js";
import { canAccess, isOwner, isDemoCanvas } from "./services/permissionService.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "1234", 10);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);
app.use(express.json());

app.post("/rooms", async (req, res) => {
  try {
    const { ownerId } = req.body;
    const roomId = Math.random().toString(36).substring(2, 15);

    await createCanvasForRoom(roomId, ownerId);

    console.log(
      `✨ Created room ${roomId} (Owner: ${ownerId || "Anonymous"})`
    );

    res.json({ roomId });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/", (_req, res) => {
  res.send("Yjs WebSocket server is running with Express 🚀");
});

app.delete("/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const isOwnerResult = await isOwner(roomId, userId);
    if (!isOwnerResult) {
      res.status(403).json({ error: "Only the owner can delete this canvas" });
      return;
    }

    await deleteCanvas(roomId);
    console.log(`🗑️ Room ${roomId} deleted by ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

app.patch("/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, isPublic } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const isOwnerResult = await isOwner(roomId, userId);
    if (!isOwnerResult) {
      res
        .status(403)
        .json({ error: "Only the owner can update this canvas" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (typeof isPublic === "boolean") {
      updates.isPublic = isPublic;
    }

    await updateCanvas(roomId, updates);
    console.log(`✏️ Room ${roomId} updated by ${userId}:`, updates);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ error: "Failed to update room" });
  }
});

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024,
  },
});

const mongodbUri = process.env.MONGO_URI || "";
const mongodbPersistence = new MongodbPersistence(mongodbUri, {
  collectionName: "editors",
  flushSize: 400,
  multipleCollections: true,
});

wss.on("connection", async (conn, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const roomName = url.pathname.slice(1) || "default";
  const userId = url.searchParams.get("userId");

  console.log(
    `🧩 Client connected to room: ${roomName}${
      userId ? ` (user: ${userId})` : " (anonymous)"
    }`
  );

  if (isDemoCanvas(roomName)) {
    console.log(`🎮 Demo connection (anonymous)`);
    setupWSConnection(conn, req, { docName: roomName });
    return;
  }

  try {
    const hasAccess = await canAccess(roomName, userId);
    if (!hasAccess) {
      console.log(
        `🚫 Access denied for ${userId || "anonymous"} to room ${roomName}`
      );
      conn.close(4403, "Access denied");
      return;
    }

    if (userId) {
      addCollaborator(roomName, userId).catch((err) =>
        console.error("Failed to track collaborator:", err)
      );
    }

    setupWSConnection(conn, req, { docName: roomName });
  } catch (err) {
    console.error("Permission check failed:", err);
    conn.close(4500, "Internal error");
  }
});

setPersistence({
  bindState: async (docName: string, ydoc: Y.Doc) => {
    if (docName === "landing-demo") return;

    console.log(`⤵️ bindState called for "${docName}"`);
    try {
      const persistedYdoc = await mongodbPersistence.getYDoc(docName);
      const persistedUpdate = Y.encodeStateAsUpdate(persistedYdoc);

      const size = persistedUpdate?.byteLength ?? persistedUpdate?.length;
      console.log(` - persistedUpdate size: ${size}`);

      if (size && size > 0) {
        Y.applyUpdate(ydoc, persistedUpdate);
      }

      if (typeof persistedYdoc?.destroy === "function") {
        persistedYdoc.destroy();
      }

      ydoc.on("update", async (update: Uint8Array) => {
        const updateSize = update?.byteLength ?? update?.length;
        try {
          if (updateSize && updateSize > 0) {
            await mongodbPersistence.storeUpdate(docName, update);
          }
        } catch (err) {
          console.error("Error storing update:", err);
        }
      });
    } catch (err) {
      console.error("bindState error:", err);
    }
  },

  writeState: async (docName: string, ydoc: Y.Doc) => {
    if (docName === "landing-demo") return;

    console.log(`⤴️ writeState called for "${docName}"`);
    try {
      await mongodbPersistence.flushDocument(docName);

      const mergedUpdate = Y.encodeStateAsUpdate(ydoc);
      const mergedSize =
        mergedUpdate?.byteLength ?? mergedUpdate?.length;
      console.log(` - mergedUpdate size: ${mergedSize}`);

      if (mergedSize && mergedSize > 0) {
        await mongodbPersistence.storeUpdate(docName, mergedUpdate);
      }
    } catch (err) {
      console.error("writeState error:", err);
    }
  },
});

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...\n");
  server.close(() => {
    console.log("✅ Server closed.");
    process.exit(0);
  });
});

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI is missing in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Mongoose connected");

    server.listen(PORT, () => {
      console.log(
        `✅ Express + Yjs WebSocket server running at ws://localhost:${PORT}`
      );
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
