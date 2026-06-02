export const config = {
    websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:1234",
    get httpUrl() {
        return this.websocketUrl.replace("ws://", "http://").replace("wss://", "https://");
    },
};

if (typeof window === "undefined" && process.env.NODE_ENV === "development") {
    if (!process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
        console.warn("NEXT_PUBLIC_WEBSOCKET_URL not set, using default ws://localhost:1234");
    }
}
