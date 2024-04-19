import {createClient} from 'redis';
import dotenv from "dotenv";

dotenv.config()

export const redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    },
})

export const getDataFromRedisCache = async (cacheKey) => {
    try {
        return await redisClient.get(cacheKey)
    } catch (e) {
        console.error("Redis get error: ", e)
        return null
    }
}

export const setDataInRedisCache = async (model, data, expiry) => {
    try {
        const {_id} = data
        const cacheKey = `${model}-${_id}`
        await redisClient.setEx(cacheKey, expiry, JSON.stringify(data))
        console.log(`Trip with ${_id} cached in redis successfully`)
    } catch (e) {
        console.error("Redis set error: ", e)
    }
}