/**
 * Enhanced Token Security Middleware
 * Additional security layers for JWT token validation and user ownership verification
 *
 * @author Labor2Hire Team
 * @description Provides advanced token validation, replay attack prevention, and user session management
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logger } from "../config/logger.js";
import User from "../modules/authentication/models/User.js";
import UserProfile from "../modules/user-management/models/UserProfile.js";
import { AuthenticationError, AuthorizationError } from "./errorHandler.js";

/**
 * In-memory store for token blacklist and session tracking
 * In production, this should be moved to Redis
 */
const blacklistedTokens = new Set();
const activeSessions = new Map(); // userId -> Set of token JTIs
const tokenFingerprints = new Map(); // tokenId -> fingerprint

/**
 * Generate device fingerprint for additional security
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint hash
 */
const generateDeviceFingerprint = (req) => {
  const fingerprint = [
    req.get("User-Agent") || "unknown",
    req.get("Accept-Language") || "unknown",
    req.get("Accept-Encoding") || "unknown",
    req.ip || "unknown",
  ].join("|");

  return crypto.createHash("sha256").update(fingerprint).digest("hex");
};

/**
 * Enhanced JWT token verification with additional security checks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const enhancedTokenValidation = async (req, res, next) => {
  try {
    // Skip if no user is authenticated
    if (!req.user || !req.user.id) {
      return next();
    }

    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.jti) {
      logger.warn("Token missing JTI (JWT ID)", {
        userId: req.user.id,
        requestId: req.requestId,
      });
      throw new AuthenticationError("Invalid token format");
    }

    // Check if token is blacklisted
    if (blacklistedTokens.has(decoded.jti)) {
      logger.warn("Blacklisted token used", {
        userId: req.user.id,
        jti: decoded.jti,
        requestId: req.requestId,
      });
      throw new AuthenticationError("Token has been revoked");
    }

    // Verify token still belongs to active session
    const userSessions = activeSessions.get(req.user.id);
    if (!userSessions || !userSessions.has(decoded.jti)) {
      logger.warn("Token not in active sessions", {
        userId: req.user.id,
        jti: decoded.jti,
        requestId: req.requestId,
      });
      throw new AuthenticationError("Session expired");
    }

    // Check device fingerprint consistency
    const currentFingerprint = generateDeviceFingerprint(req);
    const storedFingerprint = tokenFingerprints.get(decoded.jti);

    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      logger.error("Device fingerprint mismatch - possible token theft", {
        userId: req.user.id,
        jti: decoded.jti,
        expectedFingerprint: storedFingerprint.substring(0, 8) + "...",
        actualFingerprint: currentFingerprint.substring(0, 8) + "...",
        requestId: req.requestId,
      });

      // Blacklist the token and invalidate session
      blacklistedTokens.add(decoded.jti);
      if (userSessions) {
        userSessions.delete(decoded.jti);
      }
      tokenFingerprints.delete(decoded.jti);

      throw new AuthenticationError("Security violation detected");
    }

    // Store fingerprint if not exists
    if (!storedFingerprint) {
      tokenFingerprints.set(decoded.jti, currentFingerprint);
    }

    // Verify user still exists and is active
    const user = await User.findById(req.user.id).select(
      "accountStatus isActive"
    );
    if (!user) {
      logger.warn("Token belongs to non-existent user", {
        userId: req.user.id,
        jti: decoded.jti,
        requestId: req.requestId,
      });
      throw new AuthenticationError("User account not found");
    }

    if (user.accountStatus !== "active" || !user.isActive) {
      logger.warn("Token belongs to inactive user", {
        userId: req.user.id,
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        requestId: req.requestId,
      });
      throw new AuthenticationError("User account is inactive");
    }

    // Add security context to request
    req.security = {
      tokenId: decoded.jti,
      deviceFingerprint: currentFingerprint,
      tokenIssuedAt: new Date(decoded.iat * 1000),
      tokenExpiresAt: new Date(decoded.exp * 1000),
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    logger.error("Enhanced token validation error", {
      error: error.message,
      userId: req.user?.id,
      requestId: req.requestId,
    });

    throw new AuthenticationError("Token validation failed");
  }
};

/**
 * Strict ownership validation middleware
 * Ensures users can only access their own resources with additional checks
 * @param {string} resourceType - Type of resource being accessed
 * @param {string} ownershipField - Field to check for ownership (default: 'userId')
 */
export const strictOwnershipValidation = (
  resourceType = "resource",
  ownershipField = "userId"
) => {
  return async (req, res, next) => {
    try {
      const { id: authenticatedUserId, role } = req.user;
      const resourceId =
        req.params.profileId || req.params.userId || req.params.id;

      // Skip for admins (they have global access)
      if (role === "admin") {
        logger.info("Admin access granted", {
          adminId: authenticatedUserId,
          resourceType,
          resourceId,
          requestId: req.requestId,
        });
        return next();
      }

      // For profile access, verify ownership through UserProfile model
      if (resourceType === "profile" && resourceId) {
        const profile = await UserProfile.findById(resourceId).select("userId");

        if (!profile) {
          logger.warn("Attempted access to non-existent profile", {
            userId: authenticatedUserId,
            profileId: resourceId,
            requestId: req.requestId,
          });
          throw new AuthorizationError("Profile not found");
        }

        const profileOwnerId = profile.userId.toString();

        if (profileOwnerId !== authenticatedUserId) {
          logger.error("Unauthorized profile access attempt", {
            attemptedBy: authenticatedUserId,
            profileId: resourceId,
            actualOwner: profileOwnerId,
            requestPath: req.originalUrl,
            method: req.method,
            requestId: req.requestId,
          });

          // Log potential security violation
          await logSecurityViolation(
            authenticatedUserId,
            "unauthorized_profile_access",
            {
              targetProfileId: resourceId,
              actualOwner: profileOwnerId,
              requestPath: req.originalUrl,
            }
          );

          throw new AuthorizationError("You can only access your own profile");
        }

        // Add profile ownership info to request
        req.resourceOwnership = {
          verified: true,
          resourceType: "profile",
          resourceId: resourceId,
          ownerId: profileOwnerId,
        };
      }

      // For direct user ID access
      else if (resourceId && resourceId !== authenticatedUserId) {
        logger.error("Unauthorized user resource access attempt", {
          attemptedBy: authenticatedUserId,
          targetUserId: resourceId,
          requestPath: req.originalUrl,
          method: req.method,
          requestId: req.requestId,
        });

        await logSecurityViolation(
          authenticatedUserId,
          "unauthorized_user_access",
          {
            targetUserId: resourceId,
            requestPath: req.originalUrl,
          }
        );

        throw new AuthorizationError("You can only access your own data");
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }

      logger.error("Ownership validation error", {
        error: error.message,
        userId: req.user?.id,
        resourceType,
        requestId: req.requestId,
      });

      throw new AuthorizationError("Access validation failed");
    }
  };
};

/**
 * Log security violations for monitoring and alerting
 * @param {string} userId - User ID who attempted the violation
 * @param {string} violationType - Type of security violation
 * @param {Object} metadata - Additional metadata about the violation
 */
const logSecurityViolation = async (userId, violationType, metadata = {}) => {
  try {
    logger.error("SECURITY VIOLATION DETECTED", {
      violationType,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
      severity: "HIGH",
    });

    // In production, this could trigger alerts, update user risk scores,
    // or temporarily restrict account access
  } catch (error) {
    logger.error("Failed to log security violation", {
      error: error.message,
      userId,
      violationType,
    });
  }
};

/**
 * Token session management functions
 */
export const tokenSessionManager = {
  /**
   * Register a new token session
   * @param {string} userId - User ID
   * @param {string} tokenId - JWT ID (jti)
   * @param {string} deviceFingerprint - Device fingerprint
   */
  registerSession: (userId, tokenId, deviceFingerprint) => {
    if (!activeSessions.has(userId)) {
      activeSessions.set(userId, new Set());
    }
    activeSessions.get(userId).add(tokenId);
    tokenFingerprints.set(tokenId, deviceFingerprint);

    logger.info("Token session registered", {
      userId,
      tokenId: tokenId.substring(0, 8) + "...",
      sessionCount: activeSessions.get(userId).size,
    });
  },

  /**
   * Invalidate a specific token session
   * @param {string} userId - User ID
   * @param {string} tokenId - JWT ID (jti)
   */
  invalidateSession: (userId, tokenId) => {
    blacklistedTokens.add(tokenId);

    const userSessions = activeSessions.get(userId);
    if (userSessions) {
      userSessions.delete(tokenId);
      if (userSessions.size === 0) {
        activeSessions.delete(userId);
      }
    }

    tokenFingerprints.delete(tokenId);

    logger.info("Token session invalidated", {
      userId,
      tokenId: tokenId.substring(0, 8) + "...",
    });
  },

  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   */
  invalidateAllUserSessions: (userId) => {
    const userSessions = activeSessions.get(userId);
    if (userSessions) {
      userSessions.forEach((tokenId) => {
        blacklistedTokens.add(tokenId);
        tokenFingerprints.delete(tokenId);
      });
      activeSessions.delete(userId);
    }

    logger.info("All user sessions invalidated", {
      userId,
      sessionCount: userSessions ? userSessions.size : 0,
    });
  },

  /**
   * Get active session count for a user
   * @param {string} userId - User ID
   * @returns {number} Number of active sessions
   */
  getActiveSessionCount: (userId) => {
    const userSessions = activeSessions.get(userId);
    return userSessions ? userSessions.size : 0;
  },

  /**
   * Clean up expired tokens from memory
   */
  cleanupExpiredTokens: () => {
    const now = Date.now() / 1000;
    let cleanupCount = 0;

    for (const [tokenId, fingerprint] of tokenFingerprints.entries()) {
      try {
        const decoded = jwt.decode(tokenId);
        if (decoded && decoded.exp && decoded.exp < now) {
          blacklistedTokens.delete(tokenId);
          tokenFingerprints.delete(tokenId);

          // Find and remove from user sessions
          for (const [userId, sessions] of activeSessions.entries()) {
            if (sessions.has(tokenId)) {
              sessions.delete(tokenId);
              if (sessions.size === 0) {
                activeSessions.delete(userId);
              }
              break;
            }
          }

          cleanupCount++;
        }
      } catch (error) {
        // Invalid token, remove it
        tokenFingerprints.delete(tokenId);
        blacklistedTokens.delete(tokenId);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      logger.info("Cleaned up expired tokens", { cleanupCount });
    }
  },
};

// Run cleanup every hour
setInterval(
  () => {
    tokenSessionManager.cleanupExpiredTokens();
  },
  60 * 60 * 1000
);

export default {
  enhancedTokenValidation,
  strictOwnershipValidation,
  tokenSessionManager,
};
