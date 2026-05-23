import Canvas from "../models/Canvas.js";
import CanvasMember from "../models/CanvasMember.js";
import { getMemberRole, isOwner as checkIsOwner } from "./membershipService.js";

/**
 * Permission Service - centralized access control logic.
 * 
 * Access rules:
 * 1. Demo canvas ("landing-demo") → always accessible (but isolated)
 * 2. Public canvas (isPublic: true) → accessible to everyone
 * 3. Private canvas → only accessible to members (owner/editor/viewer)
 * 4. Anonymous users → blocked from private canvases
 */

const DEMO_CANVAS_ID = "landing-demo";

/**
 * Check if a user can access a canvas (read).
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string|null|undefined} userId - The user ID (null/undefined for anonymous)
 * @returns {Promise<boolean>}
 */
export async function canAccess(canvasId, userId) {
    // Demo canvas: always accessible
    if (canvasId === DEMO_CANVAS_ID) {
        return true;
    }

    // Get canvas to check visibility
    const canvas = await Canvas.findOne({ canvasId });

    // Canvas doesn't exist yet - allow creation flow
    if (!canvas) {
        return true;
    }

    // Public canvases: accessible to everyone
    if (canvas.isPublic) {
        return true;
    }

    // Private canvas: require authentication
    if (!userId) {
        return false;
    }

    // Owner check
    if (canvas.ownerId === userId) {
        return true;
    }

    // Member check
    const member = await CanvasMember.findOne({ canvasId, userId });
    if (member) {
        return true;
    }

    return false;
}

/**
 * Check if a user can edit a canvas (write).
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string|null|undefined} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function canEdit(canvasId, userId) {
    // Demo canvas: always editable (ephemeral)
    if (canvasId === DEMO_CANVAS_ID) {
        return true;
    }

    // Get canvas to check visibility
    const canvas = await getCanvasByRoomId(canvasId);

    // Canvas doesn't exist yet - allow creation
    if (!canvas) {
        return true;
    }

    // Public canvases: everyone can edit
    if (canvas.isPublic) {
        return true;
    }

    // Private canvas: require authentication
    if (!userId) {
        return false;
    }

    // Check membership - owners and editors can edit
    const member = await CanvasMember.findOne({ canvasId, userId });
    return member && (member.role === 'owner' || member.role === 'editor');
}

/**
 * Check if a user is the owner of a canvas.
 * Re-exported from membershipService for convenience.
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function isOwner(canvasId, userId) {
    if (!userId) return false;
    return checkIsOwner(canvasId, userId);
}

/**
 * Require owner permission, throws if not owner.
 * 
 * @param {string} canvasId - The canvas ID
 * @param {string} userId - The user ID
 * @throws {Error} If user is not the owner
 */
export async function requireOwner(canvasId, userId) {
    if (!userId) {
        throw new Error("Authentication required");
    }

    const ownerCheck = await isOwner(canvasId, userId);
    if (!ownerCheck) {
        throw new Error("Only the owner can perform this action");
    }
}

/**
 * Check if a canvas is the demo canvas.
 * 
 * @param {string} canvasId - The canvas ID
 * @returns {boolean}
 */
export function isDemoCanvas(canvasId) {
    return canvasId === DEMO_CANVAS_ID;
}
