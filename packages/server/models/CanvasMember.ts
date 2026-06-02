import mongoose, { Schema, Document, Model } from "mongoose";

export type MemberRole = "owner" | "editor" | "viewer";

export interface ICanvasMember extends Document {
  canvasId: string;
  userId: string;
  role: MemberRole;
  addedAt: Date;
}

const canvasMemberSchema = new Schema<ICanvasMember>({
  canvasId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["owner", "editor", "viewer"] as MemberRole[],
    default: "editor",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

canvasMemberSchema.index({ canvasId: 1, userId: 1 }, { unique: true });
canvasMemberSchema.index({ userId: 1, role: 1 });

const CanvasMember: Model<ICanvasMember> = mongoose.model<ICanvasMember>(
  "CanvasMember",
  canvasMemberSchema
);

export default CanvasMember;
