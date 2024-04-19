import express from "express";
import { loginUser, registerUser } from "../controllers/AuthController.js";

const authRouter = express.Router()

authRouter.post('/sign-up', registerUser)
authRouter.post('/sign-in', loginUser)

export default authRouter