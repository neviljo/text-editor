import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    roomId: {
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Room = mongoose.model("Room", roomSchema);

export default Room;
