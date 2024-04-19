import {model, Schema} from 'mongoose';

const UserSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: Number,
            required: true,
        },
        role: {
            type: String,
            default: "TRAVELER",
            enum: ['TRAVELER', 'TRAVELER_COMPANION', 'ADMIN', 'DRIVER'],
            required: true,
        },
        onRide: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const User = model('User', UserSchema);
export default User;