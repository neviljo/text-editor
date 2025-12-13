# Unified Collaboration Editor

A real-time collaborative workspace that seamlessly combines a rich text document and an infinite whiteboard canvas. Designed for teams and individuals to brainstorm, write, and visualize ideas in a single unified interface.

## 1. Project Overview

This application solves the problem of context switching between different tools for writing and drawing. By keeping the document and canvas side-by-side (or switching between them), users can maintain their flow and collaborate in real-time.

**Target Audience:**
- Remote teams running brainstorming sessions.
- Developers and designers planning features.
- Students and educators for interactive notes.

## 2. Application Flow

The application is designed with a simple, frictionless flow:

1.  **Landing Page**: The entry point.
    -   Showcases the value proposition.
    -   **Live Public Demo**: An embedded collaborative editor right on the landing page allows visitors to try the experience instantly with other concurrent visitors.
2.  **Join/Create Session**:
    -   Users can click "Enter Room" to navigate to the join page.
    -   Enter a unique Room ID or generate one to start a private session.
3.  **Live Collaboration**:
    -   Once in a room, users share the same state.
    -   Changes to the text document or whiteboard are instantly reflected for all participants in that room.

## 3. Routes & Pages

-   **`/` (Home)**: The landing page containing the hero section and the live public demo.
-   **`/join`**: A simple form to input a Room ID.
-   **`/room/[roomId]`**: The main application route where the editor and whiteboard live. The `roomId` in the URL ensures users connect to the correct session.

## 4. Code Structure

The project uses **Next.js (App Router)** and is organized as follows:

-   **`app/`**: Contains the route definitions and page layouts.
    -   `page.tsx`: Landing page logic.
    -   `layout.tsx`: Root layout (fonts, metadata).
    -   `join/` & `room/`: Page implementations for their respective routes.
-   **`components/`**: Reusable UI and logic components.
    -   **`UnifiedEditorLayout.tsx`**: The core layout component managing the split-screen view (Document vs. Canvas) and view modes.
    -   **`RoomContext.tsx`**: Manages the collaboration connection (Yjs provider, WebSocket).
    -   **`Editor.tsx`**: Wrapper for the BlockNote text editor.
    -   **`Whiteboard.tsx`**: Wrapper for the Excalidraw whiteboard.
-   **`utils/`**: Helper functions (e.g., `colors.ts` for generating random user colors).
-   **`providers/`**: Context providers for global application state.

## 5. Collaboration Model (Conceptual)

Real-time collaboration is powered by **Yjs**, a CRDT (Conflict-free Replicated Data Type) library.

-   **Shared State**: All changes (text typed, shapes drawn) are applied to a shared Yjs "Document".
-   **Peers**: Every user connected to a "Room" is a peer.
-   **Sync**: A WebSocket connection ensures that all peers stay in sync. If a user goes offline and reconnects, they receive the latest state.
-   **Awareness**: User cursors and presence information are ephemeral and broadcasted to other users to show "who is here".

**Demo vs. Real Sessions:**
-   **Demo**: Uses a hardcoded room ID (e.g., `landing-demo`). Everyone on the landing page connects to this same room.
-   **Real Sessions**: Use a unique room ID derived from the URL. This isolates data so only people with the link can see it.

## 6. State & Data Lifecycle

-   **In-Memory State**: The application currently relies on the WebSocket server to hold the state in memory while at least one client is connected.
-   **Persistence**: (Note: Unless a persistence layer like a database or file adapter is configured on the WebSocket server, data may be lost when all users leave the room or the server restarts).
-   **Client-Side**: When a user refreshes, they reconnect to the WebSocket and fetch the current state of the room from the server or other peers.

## 7. Running the Project

To run this project locally, you need the frontend application and a Yjs WebSocket server.

### Prerequisites
-   Node.js (v18+ recommended)
-   npm or yarn

### Steps

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the WebSocket Server**:
    This project requires a `y-websocket` server. You can allow the app to default to `ws://localhost:1234` or set `NEXT_PUBLIC_WEBSOCKET_URL`.
    
    In a separate terminal, run:
    ```bash
    npx y-websocket
    ```
    *(This starts a signaling server on port 1234)*

3.  **Start the Frontend**:
    ```bash
    npm run dev
    ```

4.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 8. Verification & Testing

To verify that collaboration is working:

1.  **Run the servers** (Frontend + WebSocket).
2.  **Open two different browser windows** (e.g., Chrome and Firefox, or one Incognito window) to `http://localhost:3000`.
3.  **Test the Demo**:
    -   Scroll to the generic demo on the landing page.
    -   Type in one window; observe the text appear in the other.
    -   Move your mouse; observe the cursor in the other.
4.  **Test a Private Room**:
    -   Click "Enter Room" -> Join a room named `test-room`.
    -   Do the same in the second window (join `test-room`).
    -   Verify that edits in the Document and Whiteboard sync instantly.

## 9. Design Decisions

-   **Unified Layout**: Instead of tabs, a split-pane view was chosen to encourage simultaneous referencing of notes while drawing.
-   **Yjs**: Chosen for its robustness in handling text and rich-shape conflicts compared to simpler OT solutions.
-   **Client-Side Logic**: Heavy reliance on client-side rendering (`"use client"`) for the editor components to ensure smooth interaction without server round-trips for every keystroke.

## 10. Future Improvements

-   **Persistence**: Add a database adapter (e.g., MongoDB or Postgres) to the WebSocket server to save room contents permanently.
-   **Authentication**: Add user login to identifying "who wrote what" more securely.
-   **Export**: Allow exporting the document to PDF or Markdown.
