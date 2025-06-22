/**
 * Configuration-specific Authentication and Authorization Middleware
 * Enhanced security for configuration management endpoints
 * @author Labor2Hire Team
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logger } from "../../../config/logger.js";
import { cache } from "../../../config/redis.js";
import {
  AuthenticationError,
  AuthorizationError,
} from "../../../middlewares/errorHandler.js";

// API key configurations
const API_KEY_CACHE_PREFIX = "config:api_key:";
const API_KEY_RATE_LIMIT_PREFIX = "config:rate_limit:";
const ADMIN_SESSION_PREFIX = "config:admin_session:";

/**
 * Enhanced authentication middleware for configuration endpoints
 */
export const authenticateConfigAccess = async (req, res, next) => {
  try {
    // Check for API key first (for service-to-service communication)
    const apiKey = req.get("X-Config-API-Key");
    if (apiKey) {
      return await authenticateApiKey(req, res, next, apiKey);
    }

    // Check for JWT token
    const token = extractToken(req);
    if (token) {
      return await authenticateJwtToken(req, res, next, token);
    }

    // No authentication provided
    logger.warn("Configuration access denied: No authentication provided", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
      requestId: req.requestId,
    });

    throw new AuthenticationError(
      "Configuration access requires authentication"
    );
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    logger.error("Configuration authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication system error",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * API key authentication for configuration access
 */
async function authenticateApiKey(req, res, next, apiKey) {
  try {
    // Validate API key format
    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 32) {
      throw new AuthenticationError("Invalid API key format");
    }

    // Check rate limiting for API key
    const rateLimitKey = `${API_KEY_RATE_LIMIT_PREFIX}${crypto.createHash("sha256").update(apiKey).digest("hex")}`;
    const currentRequests = (await cache.get(rateLimitKey)) || 0;

    if (currentRequests >= 1000) {
      // 1000 requests per hour
      throw new AuthenticationError("API key rate limit exceeded");
    }

    // Validate API key against environment variables
    const validApiKeys = (process.env.CONFIG_API_KEYS || "")
      .split(",")
      .filter(Boolean);
    const hashedApiKey = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const isValid = validApiKeys.some((key) => {
      const hashedValidKey = crypto
        .createHash("sha256")
        .update(key.trim())
        .digest("hex");
      return hashedValidKey === hashedApiKey;
    });

    if (!isValid) {
      throw new AuthenticationError("Invalid API key");
    }

    // Update rate limiting
    await cache.set(rateLimitKey, currentRequests + 1, 3600); // 1 hour TTL

    // Set request context
    req.configAuth = {
      type: "api-key",
      authenticated: true,
      apiKeyHash: hashedApiKey,
      permissions: ["read", "write", "admin"], // API keys have full access
    };

    logger.info("Configuration API key authentication successful", {
      apiKeyHash: hashedApiKey.substring(0, 8) + "...",
      ip: req.ip,
      url: req.originalUrl,
    });

    next();
  } catch (error) {
    throw error;
  }
}

/**
 * JWT token authentication for configuration access
 */
async function authenticateJwtToken(req, res, next, token) {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user has configuration access permissions
    if (!decoded.role || !["admin", "config-manager"].includes(decoded.role)) {
      throw new AuthorizationError(
        "Insufficient permissions for configuration access"
      );
    }

    // Check if session is still valid
    const sessionKey = `${ADMIN_SESSION_PREFIX}${decoded.id}`;
    const sessionData = await cache.get(sessionKey);

    if (!sessionData || sessionData.tokenId !== decoded.jti) {
      throw new AuthenticationError("Session expired or invalid");
    }

    // Set request context
    req.configAuth = {
      type: "jwt",
      authenticated: true,
      userId: decoded.id,
      role: decoded.role,
      permissions: getPermissionsForRole(decoded.role),
      sessionData,
    };

    req.user = {
      id: decoded.id,
      role: decoded.role,
      phoneNumber: decoded.phoneNumber,
    };

    logger.info("Configuration JWT authentication successful", {
      userId: decoded.id,
      role: decoded.role,
      ip: req.ip,
      url: req.originalUrl,
    });

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid JWT token");
    }
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("JWT token expired");
    }
    throw error;
  }
}

/**
 * Authorization middleware for specific configuration operations
 */
export const authorizeConfigOperation = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.configAuth || !req.configAuth.authenticated) {
        throw new AuthorizationError("Authentication required");
      }

      const userPermissions = req.configAuth.permissions || [];
      const hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn("Configuration operation unauthorized", {
          userId: req.configAuth.userId,
          requiredPermissions,
          userPermissions,
          url: req.originalUrl,
        });

        throw new AuthorizationError(
          "Insufficient permissions for this operation"
        );
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      logger.error("Configuration authorization error:", error);
      return res.status(500).json({
        success: false,
        message: "Authorization system error",
        timestamp: new Date().toISOString(),
      });
    }
  };
};

/**
 * Extract token from request headers
 */
function extractToken(req) {
  const authHeader = req.get("Authorization");
  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return authHeader;
}

/**
 * Get permissions for user role
 */
function getPermissionsForRole(role) {
  const permissions = {
    admin: ["read", "write", "admin", "reload", "stats"],
    "config-manager": ["read", "write", "reload"],
    "config-viewer": ["read", "stats"],
  };

  return permissions[role] || ["read"];
}

/**
 * Input sanitization middleware
 */
export const sanitizeConfigInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error("Input sanitization error:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid input data",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (typeof obj !== "object" || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeValue(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Sanitize individual values
 */
function sanitizeValue(value) {
  if (typeof value === "string") {
    // Remove potentially dangerous characters and scripts
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .replace(/[<>]/g, "")
      .trim();
  }

  return value;
}

export default {
  authenticateConfigAccess,
  authorizeConfigOperation,
  sanitizeConfigInput,
};
