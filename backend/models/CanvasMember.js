import mongoose from "mongoose";

/**
 * Canvas Membership model - tracks users and their roles on a canvas.
 * Roles: owner, editor, viewer
 * 
 * This is metadata-only for now - no permissions are enforced.
 */
const canvasMemberSchema = new mongoose.Schema({
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
        enum: ['owner', 'editor', 'viewer'],
        default: 'editor',
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

// ✅ Compound indexes for membership lookups
canvasMemberSchema.index({ canvasId: 1, userId: 1 }, { unique: true });
canvasMemberSchema.index({ userId: 1, role: 1 }); // For finding user's roles

const CanvasMember = mongoose.model("CanvasMember", canvasMemberSchema);

export default CanvasMember;
