import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import dotenv from "dotenv";
import * as Y from "yjs";
import { setPersistence, setupWSConnection } from "@y/websocket-server/utils";
import { MongodbPersistence } from "y-mongodb-provider";

dotenv.config();
const app = express()
const PORT = process.env.PORT

app.get("/", (req, res) => {
  res.send("Yjs WebSocket server is running with Express 🚀");
})

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
        console.log(" - applied persisted update");
      } else {
        console.log(" - no persisted update to apply");
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
            console.log(" - skipping empty update storage");
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
    console.log(`⤴️ writeState called for "${docName}"`);
    try {
      await mongodbPersistence.flushDocument(docName);

      const mergedUpdate = Y.encodeStateAsUpdate(ydoc);
      const mergedSize =
        mergedUpdate && (mergedUpdate.byteLength ?? mergedUpdate.length);
      console.log(` - mergedUpdate size: ${mergedSize}`);

      if (mergedSize && mergedSize > 0) {
        await mongodbPersistence.storeUpdate(docName, mergedUpdate);
        console.log(" - stored merged update");
        console.log("------------------------------");
      } else {
        console.log(" - skipping storing empty merged update");
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

// Start server
server.listen(PORT, () => {
  console.log(`✅ Express + Yjs WebSocket server running at ws://localhost:${PORT}`);
});