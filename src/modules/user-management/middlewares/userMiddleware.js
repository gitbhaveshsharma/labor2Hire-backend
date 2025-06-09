/**
 * @fileoverview User Management Middleware
 * @module middlewares/userMiddleware
 * @author Labor2Hire Team
 * @description Specialized middleware for user profile management operations
 */

import { logger } from "../../../config/logger.js";
import UserProfile from "../models/UserProfile.js";
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
} from "../../../middlewares/errorHandler.js";

/**
 * Profile ownership validation middleware
 * Ensures user can only access their own profile or admin can access any
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateProfileOwnership = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const { id: userId, role } = req.user;

    // Admins can access any profile
    if (role === "admin") {
      return next();
    }

    // Find the profile to check ownership
    const profile = await UserProfile.findById(profileId);
    if (!profile) {
      throw new NotFoundError("User profile not found");
    }

    // Check if user owns the profile
    if (profile.userId.toString() !== userId) {
      logger.warn("Unauthorized profile access attempt", {
        userId,
        profileId,
        profileOwner: profile.userId,
        requestPath: req.path,
      });
      throw new AuthorizationError("You can only access your own profile");
    }

    // Attach profile to request for future use
    req.profile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Profile completeness check middleware
 * Warns if profile completeness is below threshold
 * @param {number} threshold - Minimum completeness percentage (default: 50)
 */
export const checkProfileCompleteness = (threshold = 50) => {
  return async (req, res, next) => {
    try {
      const profile =
        req.profile || (await UserProfile.findById(req.params.profileId));

      if (profile && profile.profileCompleteness < threshold) {
        logger.info("Low profile completeness detected", {
          userId: req.user.id,
          profileId: profile._id,
          completeness: profile.profileCompleteness,
          threshold,
        });

        // Add warning to response headers
        res.set(
          "X-Profile-Completeness",
          profile.profileCompleteness.toString()
        );
        res.set(
          "X-Profile-Warning",
          "Profile completeness below recommended threshold"
        );
      }

      next();
    } catch (error) {
      // Don't fail the request for completeness check errors
      logger.warn("Profile completeness check failed", {
        error: error.message,
        userId: req.user?.id,
      });
      next();
    }
  };
};

/**
 * Skill validation middleware
 * Validates skill data format and requirements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateSkillData = (req, res, next) => {
  try {
    const { name, level, yearsOfExperience } = req.body;

    // Validate skill name format
    if (name && typeof name === "string") {
      req.body.name = name.trim().toLowerCase().replace(/\s+/g, " ");
    }

    // Validate experience level
    const validLevels = ["beginner", "intermediate", "advanced", "expert"];
    if (level && !validLevels.includes(level.toLowerCase())) {
      throw new ValidationError(
        `Skill level must be one of: ${validLevels.join(", ")}`
      );
    }

    // Validate years of experience
    if (yearsOfExperience !== undefined) {
      const years = parseInt(yearsOfExperience, 10);
      if (isNaN(years) || years < 0 || years > 50) {
        throw new ValidationError(
          "Years of experience must be between 0 and 50"
        );
      }
      req.body.yearsOfExperience = years;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Location data normalization middleware
 * Normalizes and validates location data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const normalizeLocationData = (req, res, next) => {
  try {
    const { location } = req.body;

    if (location) {
      // Normalize address data
      if (location.address) {
        Object.keys(location.address).forEach((key) => {
          if (typeof location.address[key] === "string") {
            location.address[key] = location.address[key].trim();
          }
        });
      }

      // Validate and format coordinates
      if (location.coordinates) {
        const { latitude, longitude } = location.coordinates;

        if (latitude !== undefined && longitude !== undefined) {
          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);

          if (
            isNaN(lat) ||
            isNaN(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            throw new ValidationError("Invalid coordinates provided");
          }

          // Format for MongoDB GeoJSON
          location.coordinates = {
            type: "Point",
            coordinates: [lng, lat], // MongoDB expects [longitude, latitude]
          };
        }
      }

      req.body.location = location;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rate limiting for profile operations
 * Custom rate limiting for user profile specific operations
 */
export const profileOperationsRateLimit = (
  maxOperations = 10,
  windowMs = 60000
) => {
  const operations = new Map();

  return (req, res, next) => {
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (operations.has(userId)) {
      const userOps = operations
        .get(userId)
        .filter((time) => time > windowStart);
      operations.set(userId, userOps);
    } else {
      operations.set(userId, []);
    }

    const currentOps = operations.get(userId);

    if (currentOps.length >= maxOperations) {
      logger.warn("Profile operations rate limit exceeded", {
        userId,
        operationCount: currentOps.length,
        maxOperations,
        path: req.path,
      });

      return res.status(429).json({
        success: false,
        message: "Too many profile operations. Please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    currentOps.push(now);
    operations.set(userId, currentOps);

    next();
  };
};

/**
 * Audit logging middleware for sensitive operations
 * Logs sensitive profile operations for audit purposes
 * @param {Array<string>} operations - Operations to audit
 */
export const auditProfileOperations = (operations = []) => {
  return (req, res, next) => {
    const { method, path } = req;
    const operation = `${method} ${path}`;

    // Check if this operation should be audited
    const shouldAudit =
      operations.length === 0 ||
      operations.some((op) => operation.includes(op));

    if (shouldAudit) {
      const originalSend = res.send;

      res.send = function (data) {
        // Log the audit after response is sent
        logger.info("Profile operation audit", {
          userId: req.user.id,
          operation,
          profileId: req.params.profileId,
          success: res.statusCode < 400,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });

        originalSend.call(this, data);
      };
    }

    next();
  };
};

export default {
  validateProfileOwnership,
  checkProfileCompleteness,
  validateSkillData,
  normalizeLocationData,
  profileOperationsRateLimit,
  auditProfileOperations,
};
