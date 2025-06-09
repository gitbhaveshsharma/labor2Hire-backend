/**
 * @fileoverview Location service for geolocation operations
 * @module services/LocationService
 * @author Labor2Hire Team
 */

import { getRedisClient } from '../../../config/redis.js';
import { logger } from '../../../config/logger.js';
import Location from '../models/Location.js';
import axios from 'axios';

// Helper function to get Redis client with error handling
const getRedis = () => {
  const client = getRedisClient();
  if (!client) {
    throw new Error('Redis client not available');
  }
  return client;
};

const REDIS_KEYS = {
  LOCATION: (userId) => `location:${userId}`,
  GEO_INDEX: process.env.GEO_INDEX_KEY || 'laborers:locations',
};

// Helper function to calculate distance in kilometers
const calculateDistanceInKm = (distanceInMeters) => distanceInMeters / 1000;

// Custom error class
class LocationServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'LocationServiceError';
    this.statusCode = statusCode;
  }
}

class LocationService {
  /**
   * Validate coordinates
   * @param {Array} coordinates - [longitude, latitude]
   */
  validateCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new LocationServiceError('Invalid coordinates format', 400);
    }
    
    const [longitude, latitude] = coordinates;
    
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      throw new LocationServiceError('Coordinates must be numbers', 400);
    }
    
    if (longitude < -180 || longitude > 180) {
      throw new LocationServiceError('Longitude must be between -180 and 180', 400);
    }
    
    if (latitude < -90 || latitude > 90) {
      throw new LocationServiceError('Latitude must be between -90 and 90', 400);
    }
  }

  /**
   * Update user location in Redis and optionally in MongoDB
   * @param {string} userId - User ID
   * @param {Array} coordinates - [longitude, latitude]
   * @param {string} status - User status
   * @param {boolean} persistToMongo - Whether to save to MongoDB
   */
  async updateLocation(userId, coordinates, status = 'available', persistToMongo = false) {
    const locationKey = REDIS_KEYS.LOCATION(userId);

    // Validate inputs
    this.validateCoordinates(coordinates);
    
    if (!userId) {
      throw new LocationServiceError('User ID is required', 400);
    }

    const [longitude, latitude] = coordinates;    try {
      const redisClient = getRedis();
      
      // Store location data in Redis hash
      const locationData = {
        coordinates: JSON.stringify(coordinates),
        status,
        isActive: 'true',
        lastSeen: new Date().toISOString(),
      };

      await redisClient.hSet(locationKey, locationData);

      // Add coordinates to the geospatial index
      await redisClient.geoAdd(REDIS_KEYS.GEO_INDEX, {
        longitude,
        latitude,
        member: userId,
      });

      // Optionally persist to MongoDB for historical data
      if (persistToMongo) {
        try {
          await Location.findOneAndUpdate(
            { userId },
            {
              coordinates: [longitude, latitude],
              status,
              isActive: true,
              lastSeen: new Date(),
            },
            { upsert: true, new: true }
          );
        } catch (mongoError) {
          logger.warn(`Failed to persist location to MongoDB: ${mongoError.message}`);
          // Don't fail the entire operation if MongoDB fails
        }
      }

      logger.info('Location updated successfully', { userId, coordinates, status });
      return { 
        success: true, 
        message: 'Location updated successfully',
        location: {
          coordinates,
          status,
          isActive: true,
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`Error updating location for user ${userId}:`, error);
      
      if (error instanceof LocationServiceError) {
        throw error;
      }
      
      throw new LocationServiceError('Failed to update location', 500);
    }
  }

  /**
   * Toggle user active status
   * @param {string} userId - User ID
   */
  async toggleActiveStatus(userId) {
    const locationKey = REDIS_KEYS.LOCATION(userId);

    if (!userId) {
      throw new LocationServiceError('User ID is required', 400);
    }    try {
      const redisClient = getRedis();
      const locationData = await redisClient.hGetAll(locationKey);

      if (!locationData || Object.keys(locationData).length === 0) {
        throw new LocationServiceError('Location not found', 404);
      }

      // Toggle isActive status
      const isActive = locationData.isActive === 'true';
      const updatedIsActive = !isActive;

      await redisClient.hSet(locationKey, {
        isActive: String(updatedIsActive),
        lastSeen: new Date().toISOString(),
      });

      // If going offline, remove from geo index
      if (!updatedIsActive) {
        try {
          await redisClient.zRem(REDIS_KEYS.GEO_INDEX, userId);
        } catch (geoError) {
          logger.warn(`Failed to remove user from geo index: ${geoError.message}`);
        }
      }

      logger.info('Toggled active status', { userId, isActive: updatedIsActive });
      
      return { 
        success: true, 
        message: `Status updated to ${updatedIsActive ? 'active' : 'inactive'}`,
        isActive: updatedIsActive 
      };
    } catch (error) {
      logger.error(`Error toggling active status for user ${userId}:`, error);
      
      if (error instanceof LocationServiceError) {
        throw error;
      }
      
      throw new LocationServiceError('Failed to toggle active status', 500);
    }
  }

  /**
   * Get nearby laborers using Redis geospatial queries
   * @param {number} longitude - Center longitude
   * @param {number} latitude - Center latitude
   * @param {number} radius - Search radius in meters
   * @param {Object} headers - Request headers for user service
   */
  async getNearbyLaborers(longitude, latitude, radius, headers = {}) {
    const parsedLongitude = parseFloat(longitude);
    const parsedLatitude = parseFloat(latitude);
    const parsedRadius = parseFloat(radius);

    // Validate input
    if (isNaN(parsedLongitude) || isNaN(parsedLatitude) || isNaN(parsedRadius)) {
      throw new LocationServiceError('Invalid longitude, latitude, or radius', 400);
    }

    if (parsedRadius <= 0) {
      throw new LocationServiceError('Radius must be greater than 0', 400);
    }

    this.validateCoordinates([parsedLongitude, parsedLatitude]);

    const radiusInKm = calculateDistanceInKm(parsedRadius);    try {
      const redisClient = getRedis();
      
      // Find nearby laborers using GEORADIUS
      const nearbyLaborers = await redisClient.sendCommand([
        'GEORADIUS',
        REDIS_KEYS.GEO_INDEX,
        parsedLongitude.toString(),
        parsedLatitude.toString(),
        radiusInKm.toString(),
        'km',
        'WITHDIST',
        'WITHCOORD',
      ]);

      if (!nearbyLaborers || nearbyLaborers.length === 0) {
        logger.info('No nearby laborers found within the specified radius', {
          longitude: parsedLongitude,
          latitude: parsedLatitude,
          radius: parsedRadius
        });
        return { 
          success: true, 
          message: 'No nearby laborers found',
          laborers: [],
          count: 0
        };
      }

      // Extract user IDs
      const userIds = nearbyLaborers.map(([userId]) => userId);

      // Fetch detailed user information
      let users = [];
      try {
        const userResponse = await axios.post(
          `${process.env.USER_SERVICE_URL || 'http://localhost:5001'}/api/users/batch`,
          { userIds },
          { headers, timeout: 5000 }
        );

        users = Array.isArray(userResponse.data) ? userResponse.data : Object.values(userResponse.data || {});
      } catch (userServiceError) {
        logger.error('Failed to fetch user information:', userServiceError.message);
        throw new LocationServiceError('Failed to fetch user information', 503);
      }

      // Filter active laborers and combine with location data
      const validLaborers = [];
        for (const [userId, distance, [laborerLongitude, laborerLatitude]] of nearbyLaborers) {
        // Check if user is active in Redis
        const locationKey = REDIS_KEYS.LOCATION(userId);
        const locationData = await redisClient.hGetAll(locationKey);
        
        if (locationData.isActive !== 'true') {
          continue; // Skip inactive users
        }

        // Find user info
        const userInfo = users.find(user => user._id === userId || user.id === userId);
        
        if (userInfo && userInfo.role === 'laborer') {
          validLaborers.push({
            userId,
            name: userInfo.name,
            phoneNumber: userInfo.phoneNumber,
            role: userInfo.role,
            status: locationData.status || 'available',
            distance: parseFloat(distance),
            coordinates: [parseFloat(laborerLongitude), parseFloat(laborerLatitude)],
            lastSeen: locationData.lastSeen,
          });
        }
      }

      // Sort by distance
      validLaborers.sort((a, b) => a.distance - b.distance);

      logger.info('Successfully found nearby laborers', {
        searchLocation: [parsedLongitude, parsedLatitude],
        radius: parsedRadius,
        found: validLaborers.length
      });

      return { 
        success: true, 
        message: `Found ${validLaborers.length} nearby laborer(s)`,
        laborers: validLaborers,
        count: validLaborers.length,
        searchRadius: parsedRadius
      };
    } catch (error) {
      logger.error('Error fetching nearby laborers:', error);
      
      if (error instanceof LocationServiceError) {
        throw error;
      }
      
      throw new LocationServiceError('Failed to find nearby laborers', 500);
    }
  }

  /**
   * Get user's current location from Redis
   * @param {string} userId - User ID
   */
  async getUserLocation(userId) {
    if (!userId) {
      throw new LocationServiceError('User ID is required', 400);
    }    try {
      const redisClient = getRedis();
      const locationKey = REDIS_KEYS.LOCATION(userId);
      const locationData = await redisClient.hGetAll(locationKey);

      if (!locationData || Object.keys(locationData).length === 0) {
        throw new LocationServiceError('Location not found', 404);
      }

      return {
        success: true,
        location: {
          coordinates: JSON.parse(locationData.coordinates || '[]'),
          status: locationData.status,
          isActive: locationData.isActive === 'true',
          lastSeen: locationData.lastSeen,
        }
      };
    } catch (error) {
      logger.error(`Error getting location for user ${userId}:`, error);
      
      if (error instanceof LocationServiceError) {
        throw error;
      }
      
      throw new LocationServiceError('Failed to get user location', 500);
    }
  }

  /**
   * Clear user location from Redis (logout/offline)
   * @param {string} userId - User ID
   */
  async clearUserLocation(userId) {
    if (!userId) {
      throw new LocationServiceError('User ID is required', 400);
    }    try {
      const redisClient = getRedis();
      const locationKey = REDIS_KEYS.LOCATION(userId);
      
      // Remove from hash
      await redisClient.del(locationKey);
      
      // Remove from geo index
      await redisClient.zRem(REDIS_KEYS.GEO_INDEX, userId);

      logger.info('User location cleared', { userId });
      
      return {
        success: true,
        message: 'Location cleared successfully'
      };
    } catch (error) {
      logger.error(`Error clearing location for user ${userId}:`, error);
      throw new LocationServiceError('Failed to clear user location', 500);
    }
  }
}

export default new LocationService();
