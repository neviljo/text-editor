import CanvasMember from "../models/CanvasMember.js";

/**
 * Membership Service - manages canvas membership and roles.
 * 
 * This is metadata-only for now - no permissions are enforced.
 * Roles: owner, editor, viewer
 */

/**
 * Add a member to a canvas with the specified role.
 * If user is already a member, does nothing (upsert behavior).
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string} userId - The user ID
 * @param {string} role - Role: 'owner', 'editor', or 'viewer'
 * @returns {Promise<CanvasMember>}
 */
export async function addMember(canvasId, userId, role = 'editor') {
    if (!canvasId || !userId) {
        throw new Error("canvasId and userId are required");
    }

    // Upsert: create if not exists, don't update if exists
    const member = await CanvasMember.findOneAndUpdate(
        { canvasId, userId },
        { $setOnInsert: { canvasId, userId, role, joinedAt: new Date() } },
        { upsert: true, new: true }
    );

    console.log(`👤 Member added: ${userId} as ${role} on canvas ${canvasId}`);
    return member;
}

/**
 * Get a member's role on a canvas.
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string} userId - The user ID
 * @returns {Promise<string|null>} - Role or null if not a member
 */
export async function getMemberRole(canvasId, userId) {
    const member = await CanvasMember.findOne({ canvasId, userId });
    return member?.role ?? null;
}

/**
 * Get all members of a canvas.
 * 
 * @param {string} canvasId - The canvas ID
 * @returns {Promise<CanvasMember[]>}
 */
export async function getMembers(canvasId) {
    return CanvasMember.find({ canvasId }).sort({ joinedAt: 1 });
}

/**
 * Check if a user is the owner of a canvas.
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function isOwner(canvasId, userId) {
    const role = await getMemberRole(canvasId, userId);
    return role === 'owner';
}

/**
 * Get all canvases a user is a member of.
 * 
 * @param {string} userId - The user ID
 * @returns {Promise<CanvasMember[]>}
 */
export async function getUserMemberships(userId) {
    return CanvasMember.find({ userId }).sort({ joinedAt: -1 });
}
