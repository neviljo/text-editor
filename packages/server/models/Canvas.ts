import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICanvas extends Document {
  canvasId: string;
  ownerId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const canvasSchema = new Schema<ICanvas>({
  canvasId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ownerId: {
    type: String,
    required: false,
    index: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

canvasSchema.index({ canvasId: 1, ownerId: 1 });
canvasSchema.index({ ownerId: 1, createdAt: -1 });
canvasSchema.index({ isPublic: 1 });

canvasSchema.pre("save", function (this: ICanvas, next) {
  this.updatedAt = new Date();
  next();
});

const Canvas: Model<ICanvas> = mongoose.model<ICanvas>("Canvas", canvasSchema);

export default Canvas;
