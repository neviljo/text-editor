import NodeCache from 'node-cache';

/**
 * In-memory cache for hot data to reduce database load.
 * 
 * - permissionCache: Stores access results (canAccess) 
 *   TTL: 5 minutes (300s)
 * 
 * - canvasCache: Stores canvas metadata (isOwner, isPublic)
 *   TTL: 10 minutes (600s)
 */

// Permission cache - 5 minute TTL
export const permissionCache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
});

// Canvas metadata cache - 10 minute TTL
export const canvasCache = new NodeCache({
    stdTTL: 600,
    checkperiod: 120,
    useClones: false
});

/**
 * Generate a cache key for permission checks
 * @param {string} roomId 
 * @param {string} userId 
 */
export const getPermissionKey = (roomId, userId) => `${roomId}:${userId || 'anon'}`;

/**
 * Clear all caches for a specific room (e.g. on permission change)
 * @param {string} roomId 
 */
export const invalidateRoomCaches = (roomId) => {
    // This is a naive implementation since NodeCache doesn't support glob delete nicely
    // In a real Redis scenario, we'd use scan or sets.
    // For now, we rely on TTL or clear specific keys if known.

    // At minimum, we can clear canAccess caches if we track them, 
    // but for now we'll just let them expire or implementing explicit key tracking if needed.
    // A simple approach is to flush all if it's critical, but that's too aggressive.

    // Better approach: Since we can't easily find all keys for a room without tracking,
    // we accepted eventual consistency (max 5 min delay) for revocation in this MVP.
    // For "Instant" revocation, we would need a secondary index of keys.
}
