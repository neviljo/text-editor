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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 1234;

// MongoDB connection handled in startServer

app.use(cors());
app.use(express.json());

// Create a new room
app.post("/rooms", async (req, res) => {
  try {
    const { ownerId } = req.body;
    // Generate a simple random ID similar to what was done on frontend
    const roomId = Math.random().toString(36).substring(2, 15);

    const room = new Room({
      roomId,
      ownerId: ownerId || undefined,
    });

    await room.save();
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

// Create HTTP server from Express app
const server = http.createServer(app)

// Create WebSocket server
const wss = new WebSocketServer({ server });

// MongoDB persistence setup
const mongodbPersistence = new MongodbPersistence(process.env.MONGO_URI, {
  collectionName: "editors",
  flushSize: 400,
  multipleCollections: true,
});

// Handle WebSocket connections
wss.on("connection", (conn, req) => {
  const roomName = req.url?.slice(1) || "default";
  console.log(`🧩 Client connected to room: ${roomName}`);
  setupWSConnection(conn, req, { docName: roomName });
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