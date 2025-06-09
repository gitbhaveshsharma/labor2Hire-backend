/**
 * @fileoverview Location controller for geolocation operations
 * @module controllers/LocationController
 * @author Labor2Hire Team
 */

import LocationService from "../services/locationService.js";
import { logger } from "../../../config/logger.js";

/**
 * Helper function to generate headers for external service requests
 * @param {Object} req - Express request object
 * @returns {Object} Headers object
 */
const generateHeaders = (req) => {
  const authHeader = req.header("Authorization");
  return authHeader ? { Authorization: authHeader } : {};
};

/**
 * Helper function to handle service errors
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 * @param {string} operation - Operation description
 */
const handleServiceError = (error, res, operation = "operation") => {
  logger.error(`${operation} failed:`, error);

  const statusCode = error.statusCode || 500;
  const message = error.message || `${operation} failed`;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

/**
 * Update user location in Redis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateLocation = async (req, res) => {
  try {
    const { coordinates, status, persistToMongo } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await LocationService.updateLocation(
      userId,
      coordinates,
      status,
      persistToMongo
    );

    logger.info("Location updated successfully", { userId, coordinates });
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(error, res, "Location update");
  }
};

/**
 * Toggle user active status in Redis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const toggleActiveStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await LocationService.toggleActiveStatus(userId);

    logger.info("Active status toggled", { userId, isActive: result.isActive });
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(error, res, "Toggle active status");
  }
};

/**
 * Get nearby laborers using Redis geospatial queries
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNearbyLaborers = async (req, res) => {
  try {
    const { longitude, latitude, radius } = req.query;
    const headers = generateHeaders(req);

    // Validate required parameters
    if (!longitude || !latitude || !radius) {
      return res.status(400).json({
        success: false,
        message: "Longitude, latitude, and radius are required",
      });
    }

    const result = await LocationService.getNearbyLaborers(
      longitude,
      latitude,
      radius,
      headers
    );

    logger.info("Nearby laborers retrieved", {
      searchLocation: [longitude, latitude],
      radius,
      found: result.count,
    });

    res.status(200).json(result);
  } catch (error) {
    handleServiceError(error, res, "Get nearby laborers");
  }
};

/**
 * Get user's current location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await LocationService.getUserLocation(userId);

    res.status(200).json(result);
  } catch (error) {
    handleServiceError(error, res, "Get user location");
  }
};

/**
 * Clear user location (logout/offline)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const clearUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await LocationService.clearUserLocation(userId);

    logger.info("User location cleared", { userId });
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(error, res, "Clear user location");
  }
};
