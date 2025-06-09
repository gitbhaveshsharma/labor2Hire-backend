/**
 * Authentication and Authorization Middleware
 * JWT token verification and role-based access control
 *
 * @author Labor2Hire Team
 * @description Handles authentication, authorization, and role-based access control
 */

import jwt from "jsonwebtoken";
import { logger } from "../config/logger.js";
import { HTTP_STATUS, ERROR_MESSAGES, USER_ROLES } from "../constants/index.js";
import { AuthenticationError, AuthorizationError } from "./errorHandler.js";

/**
 * Extract token from authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
const extractToken = (req) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return null;
  }

  // Support multiple token formats
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  } else if (authHeader.startsWith("Token ")) {
    return authHeader.slice(6);
  }

  return authHeader;
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {AuthenticationError} If token is invalid
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new AuthenticationError("Token has expired");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token has expired. Please log in again.");
    } else if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid token. Please log in again.");
    } else if (error.name === "NotBeforeError") {
      throw new AuthenticationError("Token not active yet.");
    }

    throw new AuthenticationError("Authentication failed.");
  }
};

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user info to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn("Authentication failed: No token provided", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId,
      });

      throw new AuthenticationError("Access denied. No token provided.");
    }

    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      phoneNumber: decoded.phoneNumber,
      tokenIat: decoded.iat,
      tokenExp: decoded.exp,
    };

    // Log successful authentication
    logger.info("User authenticated successfully", {
      userId: decoded.id,
      role: decoded.role,
      url: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    logger.error("Authentication middleware error", {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });

    throw new AuthenticationError("Authentication failed.");
  }
};

/**
 * Optional authentication middleware
 * Authenticates user if token is provided, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuthentication = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        role: decoded.role,
        phoneNumber: decoded.phoneNumber,
        tokenIat: decoded.iat,
        tokenExp: decoded.exp,
      };

      logger.info("Optional authentication successful", {
        userId: decoded.id,
        role: decoded.role,
        requestId: req.requestId,
      });
    }

    next();
  } catch (error) {
    // For optional auth, we continue without user info on error
    logger.debug("Optional authentication failed, continuing without user", {
      error: error.message,
      requestId: req.requestId,
    });

    next();
  }
};

/**
 * Role-based authorization middleware factory
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @param {Object} options - Authorization options
 * @returns {Function} Authorization middleware
 */
export const authorize = (allowedRoles = [], options = {}) => {
  const {
    requireOwnership = false,
    ownershipField = "userId",
    allowSelfAccess = false,
    selfAccessField = "id",
  } = options;

  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        throw new AuthenticationError("Authentication required.");
      }

      const { role, id: userId } = req.user;

      // Check role authorization
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        logger.warn("Authorization failed: Insufficient role", {
          userId,
          userRole: role,
          requiredRoles: allowedRoles,
          url: req.originalUrl,
          method: req.method,
          requestId: req.requestId,
        });

        throw new AuthorizationError(
          "Insufficient permissions for this action."
        );
      }

      // Check ownership if required
      if (requireOwnership || allowSelfAccess) {
        const resourceId =
          req.params[ownershipField] || req.body[ownershipField];
        const selfId = req.params[selfAccessField] || req.body[selfAccessField];

        if (requireOwnership && resourceId && resourceId !== userId) {
          logger.warn("Authorization failed: Resource ownership required", {
            userId,
            resourceId,
            ownershipField,
            requestId: req.requestId,
          });

          throw new AuthorizationError(
            "You can only access your own resources."
          );
        }

        if (
          allowSelfAccess &&
          selfId &&
          selfId !== userId &&
          !allowedRoles.includes(role)
        ) {
          logger.warn(
            "Authorization failed: Self access or admin role required",
            {
              userId,
              selfId,
              selfAccessField,
              requestId: req.requestId,
            }
          );

          throw new AuthorizationError("You can only access your own data.");
        }
      }

      // Log successful authorization
      logger.info("User authorized successfully", {
        userId,
        role,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId,
      });

      next();
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      logger.error("Authorization middleware error", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        requestId: req.requestId,
      });

      throw new AuthorizationError("Authorization failed.");
    }
  };
};

/**
 * Admin only authorization middleware
 */
export const adminOnly = authorize([USER_ROLES.ADMIN]);

/**
 * Employer only authorization middleware
 */
export const employerOnly = authorize([USER_ROLES.EMPLOYER]);

/**
 * Laborer only authorization middleware
 */
export const laborerOnly = authorize([USER_ROLES.LABORER]);

/**
 * Employer or Admin authorization middleware
 */
export const employerOrAdmin = authorize([
  USER_ROLES.EMPLOYER,
  USER_ROLES.ADMIN,
]);

/**
 * Laborer or Admin authorization middleware
 */
export const laborerOrAdmin = authorize([USER_ROLES.LABORER, USER_ROLES.ADMIN]);

/**
 * Any authenticated user authorization middleware
 */
export const authenticatedUser = authorize([
  USER_ROLES.LABORER,
  USER_ROLES.EMPLOYER,
  USER_ROLES.ADMIN,
]);

/**
 * Owner or Admin authorization middleware
 * Allows access if user owns the resource or is admin
 * @param {string} ownershipField - Field name to check for ownership
 * @returns {Function} Authorization middleware
 */
export const ownerOrAdmin = (ownershipField = "userId") => {
  return authorize([USER_ROLES.ADMIN], {
    allowSelfAccess: true,
    selfAccessField: ownershipField,
  });
};

/**
 * Self access only authorization middleware
 * Allows users to access only their own data
 * @param {string} selfAccessField - Field name to check for self access
 * @returns {Function} Authorization middleware
 */
export const selfAccessOnly = (selfAccessField = "id") => {
  return authorize([], {
    allowSelfAccess: true,
    selfAccessField,
  });
};

/**
 * API key authentication middleware
 * For service-to-service communication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.get("X-API-Key");
    const validApiKeys = process.env.API_KEYS?.split(",") || [];

    if (!apiKey) {
      throw new AuthenticationError("API key required.");
    }

    if (!validApiKeys.includes(apiKey)) {
      logger.warn("Invalid API key used", {
        apiKey: apiKey.substring(0, 8) + "...",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.requestId,
      });

      throw new AuthenticationError("Invalid API key.");
    }

    req.apiKey = apiKey;
    logger.info("API key authenticated successfully", {
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    throw new AuthenticationError("API key authentication failed.");
  }
};

/**
 * Rate limiting by user
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate limiting middleware
 */
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user?.id) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests
        .get(userId)
        .filter((time) => time > windowStart);
      userRequests.set(userId, requests);
    } else {
      userRequests.set(userId, []);
    }

    const currentRequests = userRequests.get(userId);

    if (currentRequests.length >= maxRequests) {
      logger.warn("User rate limit exceeded", {
        userId,
        requestCount: currentRequests.length,
        maxRequests,
        windowMs,
        requestId: req.requestId,
      });

      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    }

    currentRequests.push(now);
    userRequests.set(userId, currentRequests);

    next();
  };
};

export default {
  authenticate,
  optionalAuthentication,
  authorize,
  adminOnly,
  employerOnly,
  laborerOnly,
  employerOrAdmin,
  laborerOrAdmin,
  authenticatedUser,
  ownerOrAdmin,
  selfAccessOnly,
  authenticateApiKey,
  userRateLimit,
  // Backward compatibility aliases
  authenticateToken: authenticate,
  requireRole: authorize,
  // CommonJS compatibility for require() usage
  default: {
    authenticate,
    optionalAuthentication,
    authorize,
    adminOnly,
    employerOnly,
    laborerOnly,
    employerOrAdmin,
    laborerOrAdmin,
    authenticatedUser,
    ownerOrAdmin,
    selfAccessOnly,
    authenticateApiKey,
    userRateLimit,
    // Backward compatibility aliases
    authenticateToken: authenticate,
    requireRole: authorize,
  },
};

// Backward compatibility aliases
export const authenticateToken = authenticate;
export const requireRole = authorize;
