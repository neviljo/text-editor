import mongoose from "mongoose";

/**
 * Internal Canvas model - the scalable ownership-based data layer.
 * Externally, this is still exposed as "Room" via the public API.
 */
const canvasSchema = new mongoose.Schema({
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
    // Note: Collaborators are now tracked in CanvasMember collection with roles
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// ✅ Compound indexes for common queries
canvasSchema.index({ canvasId: 1, ownerId: 1 });
canvasSchema.index({ ownerId: 1, createdAt: -1 }); // For listing user's canvases
canvasSchema.index({ isPublic: 1 });

// Update timestamp on save
canvasSchema.pre('save', function () {
    this.updatedAt = new Date();
});

const Canvas = mongoose.model("Canvas", canvasSchema);

export default Canvas;
