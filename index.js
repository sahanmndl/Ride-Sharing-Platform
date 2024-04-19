import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cron from 'node-cron';
import authRouter from "./routes/AuthRoutes.js";
import tripRouter from "./routes/TripRoutes.js";
import { simulateTrip } from "./controllers/TripController.js";
import { redisClient } from "./middleware/Redis.js";

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({limit: "30mb", extended: true}))
app.use('/api/v1/auth/', authRouter)
app.use('/api/v1/trips/', tripRouter)

mongoose
    .connect(
        process.env.MONGODB_URL,
        {useNewUrlParser: true, useUnifiedTopology: true}
    )
    .then(() => app.listen(process.env.PORT || 8008))
    .then(async () => {
        console.log("CONNECTED TO MONGODB THROUGH PORT 8008")
        await redisClient
            .on('error', (err) => console.error('Redis error', err))
            .on('ready', () => console.log('Redis is ready'))
            .connect()
            .then(async () => {
                console.log("CONNECTED TO REDIS")
            })
            .catch((e) => {
                console.error("Redis connection error: ", e)
                process.exit(1)
            })
    })
    .catch((err) => {
        console.error("CONNECTION ERROR: ", err)
        process.exit(1)
    });

// cron.schedule('*/10 * * * * *', simulateTrip);