export const config = {
    websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:1234",
    get httpUrl() {
        return this.websocketUrl.replace("ws://", "http://").replace("wss://", "https://");
    }
};
