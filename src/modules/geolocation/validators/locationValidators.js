/**
 * @fileoverview Validation middleware for geolocation operations
 * @module validators/locationValidators
 * @author Labor2Hire Team
 */

import { body, query, validationResult } from 'express-validator';
import { logger } from '../../../config/logger.js';

/**
 * Generic validation middleware
 * @param {Array} validations - Array of validation rules
 * @returns {Function} Middleware function
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed:', { 
        errors: errors.array(), 
        path: req.path,
        method: req.method 
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    next();
  };
};

/**
 * Validation rules for updating location
 */
export const updateLocationValidation = [
  body('coordinates')
    .exists()
    .withMessage('Coordinates are required')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]')
    .custom((coordinates) => {
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        throw new Error('Coordinates must be an array with exactly 2 elements');
      }
      
      const [longitude, latitude] = coordinates;
      
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new Error('Longitude and latitude must be valid numbers');
      }
      
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      
      return true;
    }),
  
  body('status')
    .optional()
    .isString()
    .withMessage('Status must be a string')
    .isIn(['available', 'busy', 'offline'])
    .withMessage('Status must be one of: available, busy, offline'),
    
  body('persistToMongo')
    .optional()
    .isBoolean()
    .withMessage('persistToMongo must be a boolean')
];

/**
 * Validation rules for getting nearby laborers
 */
export const getNearbyLaborersValidation = [
  query('longitude')
    .exists()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180'),
    
  query('latitude')
    .exists()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90'),
    
  query('radius')
    .exists()
    .withMessage('Radius is required')
    .isFloat({ min: 1, max: 50000 })
    .withMessage('Radius must be a positive number between 1 and 50000 meters')
];

/**
 * Validation rules for coordinate parameters (general purpose)
 */
export const coordinateValidation = [
  body('longitude')
    .exists()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
    
  body('latitude')
    .exists()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
];

/**
 * Validation for user ID parameter
 */
export const userIdValidation = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId')
];

/**
 * Custom validation for authentication
 */
export const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    logger.warn('Authentication required but user not found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};
