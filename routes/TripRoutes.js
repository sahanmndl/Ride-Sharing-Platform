import express from "express";
import { verifyAuthToken } from "../middleware/AuthMiddleware.js";
import { createTrip, getAllReviews, getAllTrips, getTripDetails, resetUserDetails, shareFeedback, shareTripDetails, updateTripDetails } from "../controllers/TripController.js";

const tripRouter = express.Router()

tripRouter.post('/create', verifyAuthToken, createTrip);
tripRouter.post('/share/:tripId', verifyAuthToken, shareTripDetails);
tripRouter.put('/update/:tripId', verifyAuthToken, updateTripDetails)
tripRouter.get('/details/:tripId', verifyAuthToken, getTripDetails)
tripRouter.post('/review/:tripId', verifyAuthToken, shareFeedback)
tripRouter.get('/get-all-trips', verifyAuthToken, getAllTrips)
tripRouter.get('/get-all-reviews', verifyAuthToken, getAllReviews)
tripRouter.post('/reset-user', verifyAuthToken, resetUserDetails)

export default tripRouter