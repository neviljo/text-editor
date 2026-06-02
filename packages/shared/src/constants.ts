export const DEMO_CANVAS_ID = "landing-demo";

export const DEFAULT_PORT = 1234;

export const DEFAULT_WEBSOCKET_URL = "ws://localhost:1234";

export const DEFAULT_CORS_ORIGIN = "http://localhost:3000";

export const PERMISSION_CACHE_TTL = 300;

export const CANVAS_CACHE_TTL = 600;

export const WS_CLOSE_CODES = {
  ACCESS_DENIED: 4403,
  INTERNAL_ERROR: 4500,
} as const;
