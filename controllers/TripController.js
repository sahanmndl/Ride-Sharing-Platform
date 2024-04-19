import Trip from "../models/Trip.js"
import User from "../models/User.js"
import twilio from "twilio";
import * as geolib from 'geolib';
import Review from "../models/Review.js";
import { getDataFromRedisCache, setDataInRedisCache } from "../middleware/Redis.js";
import dotenv from "dotenv";

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const createTrip = async (req, res, next) => {
    try {
        const {fromX, fromY, toX, toY, driverId, cab} = req.body
        const travelerId = req.userId

        const driver = await User.findById(driverId)
        if (!driver) return res.status(404).json({message: 'Driver does not exist!'})
        const traveler = await User.findById(travelerId)
        if (!traveler) return res.status(404).json({message: 'Traveler does not exist!'})

        if(driver.onRide || driver.role !== "DRIVER") return res.status(400).json({message: 'Driver is currently engaged'})
        if(traveler.onRide || traveler.role !== "TRAVELER") return res.status(400).json({message: 'Traveler is currently engaged'})

        const trip = await Trip.create({
            fromX: fromX,
            fromY: fromY,
            toX: toX,
            toY: toY,
            driver: driver,
            traveler: traveler,
            cab: cab
        });

        driver.onRide = true
        traveler.onRide = true

        await trip.save()
        await driver.save()
        await traveler.save()
        await setDataInRedisCache('trip', trip, 10)

        return res.status(200).json({ message: "New trip has been created!", trip})
    } catch(e) {
        return res.status(500).json({ message: 'Cannot create new trip!' });
    }
}

export const shareTripDetails = async (req, res, next) => {
    const {tripId} = req.params
    const userId = req.userId
    
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({message: 'User does not exist!'})
    if (user.role !== "TRAVELER") return res.status(400).json({message: 'Only travelers can share trip details!'})
    const trip = await Trip.findById(tripId).populate('driver')
    if (!trip) return res.status(404).json({message: 'No such trip found!'})

    client.messages
        .create({
            from: '+19382536743',
            to: '+917601864173',    // phone number of the person with whom they want to share
            body: `Trip Details:\nTrip ID: ${tripId}\nDriver Name: ${trip.driver?.name}\nDriver Phone Number: ${trip.driver?.phoneNumber}\nCab Number: ${trip.cab}`,
        })
        .then((message) => {
            console.log("Trip shared: ", message.sid)
            return res.status(200).json({message: "Trip has been shared!", trip})
        })
        .catch((e) => {
            console.error(e)
            return res.status(404).json({message: 'Something unexpected happened!'})
        })
}

export const updateTripDetails = async (req, res, next) => {
    try {
        const {tripId} = req.params
        const userId = req.userId
        const {fromX, fromY, toX, toY} = req.body
        
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({message: 'User does not exist!'})
        const trip = await Trip.findById(tripId).populate('driver').populate('traveler')
        if (!trip) return res.status(404).json({message: 'No such trip found!'})
        if (userId !== trip.traveler?._id) return res.status(400).json({message: 'You are not authorized to perform this action!'})

        trip.fromX = fromX
        trip.fromY = fromY
        trip.toX = toX
        trip.toY = toY

        await trip.save()
        await setDataInRedisCache('trip', trip, 10)

        return res.status(200).json({ message: "Trip has been updated!", trip})
    } catch(e) {
        return res.status(500).json({ message: 'Cannot create new trip!' });
    }
}

export const getTripDetails = async (req, res, next) => {
    try {
        const {tripId} = req.params
        const userId = req.userId
        
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({message: 'User does not exist!'})
        
        const cacheKey = `trip-${tripId}`
        const cachedTrip = await getDataFromRedisCache(cacheKey)
        if (cachedTrip !== null) {
            await setDataInRedisCache('trip', JSON.parse(cachedTrip), 10)
            return res.status(200).json({
                trip: JSON.parse(cachedTrip),
                message: "Trip fetched from Redis successfully!"
            })
        }

        const trip = await Trip.findById(tripId).populate('driver').populate('traveler')
        if (!trip) return res.status(404).json({message: 'No such trip found!'})
        await setDataInRedisCache('trip', trip, 10)

        return res.status(200).json({ message: "Trip details", trip})
    } catch(e) {
        return res.status(500).json({ message: 'Cannot show trip details!' });
    }
}

export const simulateTrip = async () => {
    try {
        console.log("~~~~~~~~~~~~~~~~SIMULATING TRIP~~~~~~~~~~~~~~~~")
        const trips = await Trip.find({})
        trips.map(async (trip) => {
            if (!trip.hasReached) {
                trip.fromX += 0.0005
                await trip.save()
                const isWithinGeofence = geolib.isPointWithinRadius(
                    {latitude: trip.fromX, longitude: trip.fromY},
                    {latitude: trip.toX, longitude: trip.toY},
                    200
                )
                console.log(trip, isWithinGeofence)
                if (isWithinGeofence && !trip.isNearby) {
                    client.messages
                        .create({
                            from: '+19382536743',
                            to: '+917601864173',    // phone number of Traveler Companion
                            body: `Your cab (cab no.: ${trip.cab}) is nearby!`,
                        })
                        .then(async (message) => {
                            trip.isNearby = true
                            trip.hasReached = true
                            await trip.save()
                            console.log(message.sid, trip)
                        })
                        .catch((e) => {
                            console.error(e)
                        })
                }
            }
        })
    } catch (e) {
        console.error("Error simulating trip: ", e)
    }
}

export const shareFeedback = async (req, res, next) => {
    try {
        const {tripId} = req.params
        const {rating, description} = req.body
        const reviewerId = req.userId
        
        const reviewer = await User.findById(reviewerId)
        if (!reviewer) return res.status(404).json({message: 'User does not exist!'})
        if (reviewer.role !== "TRAVELER_COMPANION") return res.status(404).json({message: 'Cannot share feedback'})
        const trip = await Trip.findById(tripId)
        if (!trip) return res.status(404).json({message: 'Trip does not exist!'})

        const review = await Review.create({
            rating: rating,
            description: description,
            reviewer: reviewer,
            trip: trip
        })

        await review.save()

        return res.status(200).json({ message: "Review has been shared!", review })
    } catch (e) {
        return res.status(500).json({ message: "Error sharing review!" })
    }
}

export const getAllTrips = async (req, res, next) => {
    try {
        const userId = req.userId
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({message: 'User does not exist!'})
        if (user.role !== "ADMIN") return res.status(400).json({message: 'You do not have access to this information!'})

        const filter = {};
        if (req.query.hasReached) filter.hasReached = req.query.hasReached === 'true'

        const sort = {}
        if (req.query.sortBy && (req.query.sortBy === 'createdAt' || req.query.sortBy === 'updatedAt')) {
            sort[req.query.sortBy] = req.query.sortOrder && req.query.sortOrder.toLowerCase() === 'desc' ? -1 : 1
        }

        const trips = await Trip.find(filter).sort(sort).skip(skip).limit(limit).populate('driver').populate('traveler')
        return res.status(200).json({ message: "Here are the trips", trips })
    } catch (e) {
        return res.status(500).json({ message: "Error fetching trips!" })
    }
}

export const getAllReviews = async (req, res, next) => {
    try {
        const userId = req.userId
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({message: 'User does not exist!'})
        if (user.role !== "ADMIN") return res.status(400).json({message: 'You do not have access to this information!'})

        const filter = {};
        if (req.query.rating) filter.rating = req.query.rating

        const sort = {}
        if (req.query.sortBy && (req.query.sortBy === 'createdAt' || req.query.sortBy === 'updatedAt')) {
            sort[req.query.sortBy] = req.query.sortOrder && req.query.sortOrder.toLowerCase() === 'desc' ? -1 : 1
        }

        const reviews = await Review.find(filter).sort(sort).skip(skip).limit(limit).populate('reviewer').populate('trip')
        return res.status(200).json({ message: "Here are the reviews", reviews })
    } catch (e) {
        return res.status(500).json({ message: "Error fetching reviews!" })
    }
}

export const resetUserDetails = async (req, res, next) => {
    try {
        const users = await User.find({})
        users.map(async (user) => {
            user.onRide = false
            await user.save()
        })
        return res.status(200).json({ message: "Users have been reset!", users })
    } catch (e) {
        return res.status(500).json({ message: "Error resetting users!" })
    }
}