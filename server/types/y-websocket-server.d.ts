declare module "@y/websocket-server/utils" {
  import { Doc } from "yjs";
  import { IncomingMessage } from "http";
  import { WebSocket } from "ws";

  interface Persistence {
    bindState: (docName: string, ydoc: Doc) => Promise<void>;
    writeState: (docName: string, ydoc: Doc) => Promise<void>;
  }

  export function setPersistence(persistence: Persistence): void;
  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean }
  ): void;
}
