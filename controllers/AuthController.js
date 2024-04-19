import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const registerUser = async (req, res, next) => {
    try {
        const { email, name, password, phoneNumber, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            email,
            name,
            password: hashedPassword,
            phoneNumber,
            role
        });

        await newUser.save()

        return res.status(201).json({ user: newUser });
    } catch (e) {
        return res.status(500).json({ message: 'Cannot register user!' });
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res.status(400).json({ message: 'User does not exist' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: existingUser._id }, 'THIS_IS_MY_JWT_SECRET_KEY', {
            expiresIn: '1h',
        });

        return res.status(200).json({ message: 'User authenticated!', user: existingUser, token });
    } catch (e) {
        return res.status(500).json({ message: 'Cannot login user!' });
    }
};
