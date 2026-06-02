import Canvas from "../models/Canvas.js";
import CanvasMember from "../models/CanvasMember.js";
import { getMemberRole, isOwner as checkIsOwner } from "./membershipService.js";
import { getCanvasByRoomId } from "./canvasService.js";
import {
  permissionCache,
  getPermissionKey,
  trackPermissionKey,
} from "../utils/cache.js";

const DEMO_CANVAS_ID = "landing-demo";

export async function canAccess(
  canvasId: string,
  userId?: string | null
): Promise<boolean> {
  if (canvasId === DEMO_CANVAS_ID) {
    return true;
  }

  const cacheKey = getPermissionKey(canvasId, userId);
  const cached = permissionCache.get<boolean>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const canvas = await Canvas.findOne({ canvasId });

  if (!canvas) {
    permissionCache.set(cacheKey, true);
    trackPermissionKey(canvasId, cacheKey);
    return true;
  }

  if (canvas.isPublic) {
    permissionCache.set(cacheKey, true);
    trackPermissionKey(canvasId, cacheKey);
    return true;
  }

  if (!userId) {
    permissionCache.set(cacheKey, false);
    trackPermissionKey(canvasId, cacheKey);
    return false;
  }

  if (canvas.ownerId === userId) {
    permissionCache.set(cacheKey, true);
    trackPermissionKey(canvasId, cacheKey);
    return true;
  }

  const member = await CanvasMember.findOne({ canvasId, userId });
  const result = !!member;
  permissionCache.set(cacheKey, result);
  trackPermissionKey(canvasId, cacheKey);
  return result;
}

export async function canEdit(
  canvasId: string,
  userId?: string | null
): Promise<boolean> {
  if (canvasId === DEMO_CANVAS_ID) {
    return true;
  }

  const canvas = await getCanvasByRoomId(canvasId);

  if (!canvas) {
    return true;
  }

  if (canvas.isPublic) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const member = await CanvasMember.findOne({ canvasId, userId });
  return !!(
    member &&
    (member.role === "owner" || member.role === "editor")
  );
}

export async function isOwner(
  canvasId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;
  return checkIsOwner(canvasId, userId);
}

export async function requireOwner(
  canvasId: string,
  userId?: string
): Promise<void> {
  if (!userId) {
    throw new Error("Authentication required");
  }

  const ownerCheck = await isOwner(canvasId, userId);
  if (!ownerCheck) {
    throw new Error("Only the owner can perform this action");
  }
}

export function isDemoCanvas(canvasId: string): boolean {
  return canvasId === DEMO_CANVAS_ID;
}
