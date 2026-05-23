import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import * as Y from "yjs";
import { setPersistence, setupWSConnection } from "@y/websocket-server/utils";
import { MongodbPersistence } from "y-mongodb-provider";
import mongoose from "mongoose";
import cors from "cors";
import Room from "./models/Room.js";
import { createCanvasForRoom, addCollaborator, roomIdToCanvasId, deleteCanvas, updateCanvas } from "./services/canvasService.js";
import { canAccess, isOwner, isDemoCanvas } from "./services/permissionService.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 1234;

// MongoDB connection handled in startServer

app.use(cors());
app.use(express.json());

// Create a new room (public API unchanged, internal uses canvas)
app.post("/rooms", async (req, res) => {
  try {
    const { ownerId } = req.body;
    // Generate a simple random ID similar to what was done on frontend
    const roomId = Math.random().toString(36).substring(2, 15);

    // Legacy: still save to Room collection for backward compatibility
    const room = new Room({
      roomId,
      ownerId: ownerId || undefined,
    });
    await room.save();

    // Internal: also create canvas (the new abstraction)
    await createCanvasForRoom(roomId, ownerId);

    console.log(`✨ Created room ${roomId} (Owner: ${ownerId || "Anonymous"})`);

    res.json({ roomId });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/", (req, res) => {
  res.send("Yjs WebSocket server is running with Express 🚀");
});

// Delete a canvas (owner only)
app.delete("/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isOwnerResult = await isOwner(roomId, userId);
    if (!isOwnerResult) {
      return res.status(403).json({ error: "Only the owner can delete this canvas" });
    }

    await deleteCanvas(roomId);
    console.log(`🗑️ Room ${roomId} deleted by ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// Update canvas settings (owner only)
app.patch("/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, isPublic } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isOwnerResult = await isOwner(roomId, userId);
    if (!isOwnerResult) {
      return res.status(403).json({ error: "Only the owner can update this canvas" });
    }

    const updates = {};
    if (typeof isPublic === 'boolean') {
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

// Create HTTP server from Express app
const server = http.createServer(app)

// Create WebSocket server
// Create WebSocket server with compression enabled
const wss = new WebSocketServer({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
});

// MongoDB persistence setup
const mongodbPersistence = new MongodbPersistence(process.env.MONGO_URI, {
  collectionName: "editors",
  flushSize: 400,
  multipleCollections: true,
});

// Handle WebSocket connections
wss.on("connection", async (conn, req) => {
  // Parse URL to extract room name and query params
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const roomName = url.pathname.slice(1) || "default";
  const userId = url.searchParams.get("userId");

  console.log(`🧩 Client connected to room: ${roomName}${userId ? ` (user: ${userId})` : " (anonymous)"}`);

  // Demo canvas: allow connection but skip persistence/membership
  if (isDemoCanvas(roomName)) {
    console.log(`🎮 Demo connection (anonymous)`);
    setupWSConnection(conn, req, { docName: roomName });
    return;
  }

  // Permission check for all other canvases
  try {
    const hasAccess = await canAccess(roomName, userId);
    if (!hasAccess) {
      console.log(`🚫 Access denied for ${userId || 'anonymous'} to room ${roomName}`);
      conn.close(4403, "Access denied");
      return;
    }

    // Track collaborator join (non-blocking, metadata only)
    if (userId) {
      addCollaborator(roomName, userId).catch(err =>
        console.error("Failed to track collaborator:", err)
      );
    }

    setupWSConnection(conn, req, { docName: roomName });
  } catch (err) {
    console.error("Permission check failed:", err);
    conn.close(4500, "Internal error");
  }
});

// Persistence handlers
setPersistence({
  bindState: async (docName, ydoc) => {
    // Demo room should not be persistent
    if (docName === "landing-demo") return;

    console.log(`⤵️ bindState called for "${docName}"`);
    try {
      const persistedYdoc = await mongodbPersistence.getYDoc(docName);
      const persistedUpdate = Y.encodeStateAsUpdate(persistedYdoc);

      const size =
        persistedUpdate &&
        (persistedUpdate.byteLength ?? persistedUpdate.length);
      console.log(` - persistedUpdate size: ${size}`);

      if (size && size > 0) {
        Y.applyUpdate(ydoc, persistedUpdate);
        // console.log(" - applied persisted update");
      } else {
        // console.log(" - no persisted update to apply");
      }

      if (typeof persistedYdoc?.destroy === "function") {
        persistedYdoc.destroy();
      }

      ydoc.on("update", async (update) => {
        const updateSize = update && (update.byteLength ?? update.length);
        try {
          if (updateSize && updateSize > 0) {
            await mongodbPersistence.storeUpdate(docName, update);
          } else {
            // console.log(" - skipping empty update storage");
          }
        } catch (err) {
          console.error("Error storing update:", err);
        }
      });
    } catch (err) {
      console.error("bindState error:", err);
    }
  },

  writeState: async (docName, ydoc) => {
    // Demo room should not be persistent
    if (docName === "landing-demo") return;

    console.log(`⤴️ writeState called for "${docName}"`);
    try {
      await mongodbPersistence.flushDocument(docName);

      const mergedUpdate = Y.encodeStateAsUpdate(ydoc);
      const mergedSize =
        mergedUpdate && (mergedUpdate.byteLength ?? mergedUpdate.length);
      console.log(` - mergedUpdate size: ${mergedSize}`);

      if (mergedSize && mergedSize > 0) {
        await mongodbPersistence.storeUpdate(docName, mergedUpdate);
        // console.log(" - stored merged update");
        // console.log("------------------------------");
      } else {
        // console.log(" - skipping storing empty merged update");
      }
    } catch (err) {
      console.error("writeState error:", err);
    }
  },
});

// Graceful shutdown
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
      console.log(`✅ Express + Yjs WebSocket server running at ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();