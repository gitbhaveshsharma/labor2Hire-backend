/**
 * @fileoverview Location routes for geolocation operations
 * @module routes/locationRoutes
 * @author Labor2Hire Team
 */

import express from "express";
import * as LocationController from "../controllers/locationController.js";
import { authenticate } from "../../../middlewares/auth.js";
import {
  validate,
  updateLocationValidation,
  getNearbyLaborersValidation,
  requireAuth,
} from "../validators/locationValidators.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(requireAuth);

/**
 * @route PUT /api/geolocation/location
 * @desc Update user location
 * @access Private
 */
router.put(
  "/location",
  validate(updateLocationValidation),
  LocationController.updateLocation
);

/**
 * @route POST /api/geolocation/toggle-active
 * @desc Toggle user active status
 * @access Private
 */
router.post("/toggle-active", LocationController.toggleActiveStatus);

/**
 * @route GET /api/geolocation/nearby
 * @desc Get nearby laborers
 * @access Private
 */
router.get(
  "/nearby",
  validate(getNearbyLaborersValidation),
  LocationController.getNearbyLaborers
);

/**
 * @route GET /api/geolocation/location
 * @desc Get user's current location
 * @access Private
 */
router.get("/location", LocationController.getUserLocation);

/**
 * @route DELETE /api/geolocation/location
 * @desc Clear user location (logout/offline)
 * @access Private
 */
router.delete("/location", LocationController.clearUserLocation);

export default router;
