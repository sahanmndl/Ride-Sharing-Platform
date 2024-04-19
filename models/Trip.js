import {model, Schema} from 'mongoose';

const TripSchema = new Schema(
    {
        fromX: {
            type: Number,
            required: true,
        },
        fromY: {
            type: Number,
            required: true,
        },
        toX: {
            type: Number,
            required: true
        },
        toY: {
            type: Number,
            required: true
        },
        cab: {
            type: Number,
            required: true
        },
        isNearby: {
            type: Boolean,
            default: false,
        },
        hasReached: {
            type: Boolean,
            default: false,
        },
        driver: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        traveler: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true
    }
);

const Trip = model('Trip', TripSchema);
export default Trip;