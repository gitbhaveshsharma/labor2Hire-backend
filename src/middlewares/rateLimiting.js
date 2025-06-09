/**
 * Rate Limiting Middleware
 * Provides rate limiting functionality for different types of requests
 */

import rateLimit from "express-rate-limit";
import { logger } from "../config/logger.js";

/**
 * General authentication rate limiter
 * Allows more requests for general auth operations
 */
export const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many authentication requests, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * Sensitive operations rate limiter
 * More strict rate limiting for sensitive operations like password reset
 */
export const rateLimitSensitive = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs for sensitive operations
  message: {
    success: false,
    message: "Too many sensitive requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      `Sensitive rate limit exceeded for IP: ${req.ip} on ${req.path}`
    );
    res.status(429).json({
      success: false,
      message: "Too many sensitive requests, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * General API rate limiter
 * Basic rate limiting for general API endpoints
 */
export const rateLimitGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`General rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * Role-based rate limiter
 * Different rate limits based on user role or request type
 * @param {string} roleOrType - Role type ('user', 'admin', 'public')
 * @returns {Function} Rate limiting middleware
 */
export const rateLimitByRole = (roleOrType = "user") => {
  const configs = {
    public: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // 50 requests per window for public
      message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    },
    user: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per window for authenticated users
      message: {
        success: false,
        message: "Too many requests, please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    },
    admin: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per window for admins
      message: {
        success: false,
        message: "Rate limit exceeded, please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    },
  };

  const config = configs[roleOrType] || configs.user;

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(
        `Rate limit exceeded for role ${roleOrType} - IP: ${req.ip} on ${req.path}`
      );
      res.status(429).json(config.message);
    },
  });
};

export default {
  rateLimitAuth,
  rateLimitSensitive,
  rateLimitGeneral,
  rateLimitByRole,
};

// End of file
