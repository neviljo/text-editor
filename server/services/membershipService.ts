import CanvasMember, {
  ICanvasMember,
  MemberRole,
} from "../models/CanvasMember.js";

export async function addMember(
  canvasId: string,
  userId: string,
  role: MemberRole = "editor"
): Promise<ICanvasMember> {
  if (!canvasId || !userId) {
    throw new Error("canvasId and userId are required");
  }

  const member = await CanvasMember.findOneAndUpdate(
    { canvasId, userId },
    { $setOnInsert: { canvasId, userId, role, joinedAt: new Date() } },
    { upsert: true, new: true }
  );

  console.log(`👤 Member added: ${userId} as ${role} on canvas ${canvasId}`);
  return member;
}

export async function getMemberRole(
  canvasId: string,
  userId: string
): Promise<MemberRole | null> {
  const member = await CanvasMember.findOne({ canvasId, userId });
  return (member?.role as MemberRole) ?? null;
}

export async function getMembers(canvasId: string): Promise<ICanvasMember[]> {
  return CanvasMember.find({ canvasId }).sort({ joinedAt: 1 });
}

export async function isOwner(
  canvasId: string,
  userId: string
): Promise<boolean> {
  const role = await getMemberRole(canvasId, userId);
  return role === "owner";
}

export async function getUserMemberships(
  userId: string
): Promise<ICanvasMember[]> {
  return CanvasMember.find({ userId }).sort({ joinedAt: -1 });
}
