import NodeCache from "node-cache";

const roomKeyIndex = new Map<string, Set<string>>();

export const permissionCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

export const canvasCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

export const getPermissionKey = (
  roomId: string,
  userId: string | null | undefined
): string => `${roomId}:${userId || "anon"}`;

export const trackPermissionKey = (
  roomId: string,
  cacheKey: string
): void => {
  if (!roomKeyIndex.has(roomId)) {
    roomKeyIndex.set(roomId, new Set());
  }
  roomKeyIndex.get(roomId)!.add(cacheKey);
};

export const invalidateRoomCaches = (roomId: string): void => {
  const keys = roomKeyIndex.get(roomId);
  if (keys) {
    keys.forEach((key) => permissionCache.del(key));
    roomKeyIndex.delete(roomId);
  }
};
