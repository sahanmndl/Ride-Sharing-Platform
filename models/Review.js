import {model, Schema} from 'mongoose';

const ReviewSchema = new Schema(
    {
        rating: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        reviewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        trip: {
            type: Schema.Types.ObjectId,
            ref: "Trip",
        },
    },
    {
        timestamps: true
    }
);

const Review = model('Review', ReviewSchema);
export default Review;