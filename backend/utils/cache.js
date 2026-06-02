import NodeCache from 'node-cache';

const roomKeyIndex = new Map();

export const permissionCache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
});

export const canvasCache = new NodeCache({
    stdTTL: 600,
    checkperiod: 120,
    useClones: false
});

export const getPermissionKey = (roomId, userId) => `${roomId}:${userId || 'anon'}`;

export const trackPermissionKey = (roomId, cacheKey) => {
    if (!roomKeyIndex.has(roomId)) {
        roomKeyIndex.set(roomId, new Set());
    }
    roomKeyIndex.get(roomId).add(cacheKey);
};

export const invalidateRoomCaches = (roomId) => {
    const keys = roomKeyIndex.get(roomId);
    if (keys) {
        keys.forEach(key => permissionCache.del(key));
        roomKeyIndex.delete(roomId);
    }
};
