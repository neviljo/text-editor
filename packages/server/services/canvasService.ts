import Canvas from "../models/Canvas.js";
import CanvasMember from "../models/CanvasMember.js";
import { addMember } from "./membershipService.js";

export interface CreateCanvasResult {
  canvasId: string;
  roomId: string;
}

export async function createCanvasForRoom(
  roomId: string,
  ownerId?: string
): Promise<CreateCanvasResult> {
  const canvasId = roomId;

  const canvas = new Canvas({
    canvasId,
    ownerId: ownerId || undefined,
  });

  await canvas.save();

  if (ownerId) {
    await addMember(canvasId, ownerId, "owner");
  }

  console.log(`🎨 Canvas created: ${canvasId} (mapped from room: ${roomId})`);

  return { canvasId, roomId };
}

export async function addCollaborator(
  canvasId: string,
  userId: string
): Promise<void> {
  if (!userId) return;
  await addMember(canvasId, userId, "editor");
}

export async function getCanvasByRoomId(
  roomId: string
): Promise<typeof Canvas.prototype | null> {
  const canvasId = roomId;
  return Canvas.findOne({ canvasId });
}

export function roomIdToCanvasId(roomId: string): string {
  return roomId;
}

export function canvasIdToRoomId(canvasId: string): string {
  return canvasId;
}

export async function deleteCanvas(canvasId: string): Promise<void> {
  await Canvas.deleteOne({ canvasId });
  await CanvasMember.deleteMany({ canvasId });
  console.log(`🗑️ Canvas deleted: ${canvasId}`);
}

export async function updateCanvas(
  canvasId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await Canvas.findOneAndUpdate({ canvasId }, updates);
  console.log(`✏️ Canvas updated: ${canvasId}`);
}
