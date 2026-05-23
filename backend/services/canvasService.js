import Canvas from "../models/Canvas.js";
import CanvasMember from "../models/CanvasMember.js";
import { addMember } from "./membershipService.js";

/**
 * Canvas Service - Internal business logic layer.
 * Maps room IDs to canvas IDs and handles canvas operations.
 * 
 * Currently uses 1:1 mapping (roomId === canvasId) for backward compatibility.
 * Future: Can be extended for room aliasing, sharing, etc.
 */

/**
 * Create a new canvas (internally) for a room.
 * @param {string} roomId - The public room ID
 * @param {string|undefined} ownerId - Optional owner user ID
 * @returns {Promise<{canvasId: string, roomId: string}>}
 */
export async function createCanvasForRoom(roomId, ownerId) {
    // 1:1 mapping: canvasId equals roomId for now
    const canvasId = roomId;

    const canvas = new Canvas({
        canvasId,
        ownerId: ownerId || undefined,
    });

    await canvas.save();

    // Add owner as member with 'owner' role
    if (ownerId) {
        await addMember(canvasId, ownerId, 'owner');
    }

    console.log(`🎨 Canvas created: ${canvasId} (mapped from room: ${roomId})`);

    return { canvasId, roomId };
}

/**
 * Add a collaborator when they join a canvas.
 * Called on WebSocket connection. Non-blocking, metadata only.
 * 
 * @param {string} canvasId - The canvas ID (same as room ID for now)
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export async function addCollaborator(canvasId, userId) {
    if (!userId) return;

    // Add as editor (upsert - won't downgrade existing owner)
    await addMember(canvasId, userId, 'editor');
}

/**
 * Get canvas by room ID.
 * @param {string} roomId - The public room ID
 * @returns {Promise<Canvas|null>}
 */
export async function getCanvasByRoomId(roomId) {
    // 1:1 mapping: canvasId equals roomId
    const canvasId = roomId;
    return Canvas.findOne({ canvasId });
}

/**
 * Map a room ID to its internal canvas ID.
 * @param {string} roomId - The public room ID
 * @returns {string} - The internal canvas ID
 */
export function roomIdToCanvasId(roomId) {
    // 1:1 mapping for now
    return roomId;
}

/**
 * Map a canvas ID back to its public room ID.
 * @param {string} canvasId - The internal canvas ID
 * @returns {string} - The public room ID
 */
export function canvasIdToRoomId(canvasId) {
    // 1:1 mapping for now
    return canvasId;
}

/**
 * Delete a canvas and all its memberships.
 * @param {string} canvasId - The canvas ID
 * @returns {Promise<void>}
 */
export async function deleteCanvas(canvasId) {
    await Canvas.deleteOne({ canvasId });
    await CanvasMember.deleteMany({ canvasId });
    console.log(`🗑️ Canvas deleted: ${canvasId}`);
}

/**
 * Update canvas settings.
 * @param {string} canvasId - The canvas ID
 * @param {Object} updates - The updates to apply (e.g., { isPublic: true })
 * @returns {Promise<void>}
 */
export async function updateCanvas(canvasId, updates) {
    await Canvas.findOneAndUpdate({ canvasId }, updates);
    console.log(`✏️ Canvas updated: ${canvasId}`);
}

