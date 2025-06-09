/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */

import { validationResult } from "express-validator";
import * as authService from "../services/authService.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/authService.js";
import { tokenSessionManager } from "../../../middlewares/tokenSecurity.js";
import User from "../models/User.js";
import { logger } from "../../../config/logger.js";
import {
  AppError,
  ValidationError,
  AuthenticationError,
} from "../../../middlewares/errorHandler.js";
import { asyncHandler } from "../../../middlewares/errorHandler.js";

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const { name, phoneNumber, password, role, languagePreference } = req.body;
  const user = await authService.registerUser({
    name,
    phoneNumber,
    password,
    role,
    languagePreference,
  });
  // Generate initial tokens for the new user
  const accessTokenData = generateAccessToken(
    user._id,
    user.role,
    user.accountStatus
  );
  const refreshTokenData = generateRefreshToken(user._id);

  // Extract tokens from the enhanced objects
  const accessToken = accessTokenData.token;
  const refreshToken = refreshTokenData.token;
  // Save refresh token to user - need to get the user document again to save
  await User.findByIdAndUpdate(user._id, { refreshToken });
  // Register the new session with enhanced token tracking
  const deviceFingerprint =
    req.get("X-Device-Fingerprint") ||
    `${req.ip}_${req.get("User-Agent") || "unknown"}`;

  tokenSessionManager.registerSession(
    user._id,
    accessTokenData.tokenId,
    deviceFingerprint
  );
  tokenSessionManager.registerSession(
    user._id,
    refreshTokenData.tokenId,
    deviceFingerprint
  );

  // Set refresh token as httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Calculate token expiration times
  const accessTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  logger.info("User registration successful", {
    userId: user._id,
    phoneNumber: maskPhoneNumber(phoneNumber),
    role: user.role,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      // User information
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phoneNumber: maskPhoneNumber(user.phoneNumber),
        role: user.role,
        languagePreference: user.languagePreference,
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified || false,
        isPhoneVerified: user.isPhoneVerified || false,
        profilePicture: user.profilePicture || null,
        walletBalance: user.walletBalance || 0,
        location: user.location || null,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        metadata: {
          loginAttempts: 0,
          registrationIP: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
          deviceInfo: {
            platform: req.get("sec-ch-ua-platform") || "unknown",
            mobile: req.get("sec-ch-ua-mobile") === "?1",
          },
        },
      },

      // Session information (auto-login after registration)
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 86400, // 24 hours in seconds
        expires_at: Math.floor(accessTokenExpiresAt.getTime() / 1000),
        refresh_token_expires_at: Math.floor(
          refreshTokenExpiresAt.getTime() / 1000
        ),
        token_type: "Bearer",
        user: {
          id: user._id,
          aud: "labor2hire-client",
          role: user.role,
          account_status: user.accountStatus,
          phone: maskPhoneNumber(user.phoneNumber),
          confirmed_at: user.createdAt,
          last_sign_in_at: null, // First registration
          app_metadata: {
            provider: "phone",
            providers: ["phone"],
          },
          user_metadata: {
            name: user.name,
            language_preference: user.languagePreference,
            role: user.role,
          },
        },
      },

      // Authentication tokens (for backward compatibility)
      accessToken,
      refreshToken,

      // Additional session metadata
      sessionMetadata: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        registrationTimestamp: new Date().toISOString(),
        expiresAt: accessTokenExpiresAt.toISOString(),
        refreshExpiresAt: refreshTokenExpiresAt.toISOString(),
        issuer: "labor2hire-backend",
        audience: "labor2hire-client",
        registrationMethod: "phone_password",
        securityLevel: "standard",
        mfaEnabled: false, // TODO: Implement MFA
        permissions: await getUserPermissions(user.role, user.accountStatus),
        features: await getUserFeatures(user.role, user.accountStatus),
        onboardingRequired: true, // New users need onboarding
      },
    },
  });
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const { phoneNumber, password } = req.body;
  const { user, accessToken, refreshToken, accessTokenData, refreshTokenData } =
    await authService.loginUser(phoneNumber, password);

  // Register the new session with enhanced token tracking
  const deviceFingerprint =
    req.get("X-Device-Fingerprint") ||
    `${req.ip}_${req.get("User-Agent") || "unknown"}`;

  tokenSessionManager.registerSession(
    user._id,
    accessTokenData.tokenId,
    deviceFingerprint
  );
  tokenSessionManager.registerSession(
    user._id,
    refreshTokenData.tokenId,
    deviceFingerprint
  );

  // Set refresh token as httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  logger.info("User login successful", {
    userId: user._id,
    phoneNumber: maskPhoneNumber(phoneNumber),
    role: user.role,
  });
  // Calculate token expiration times
  const accessTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      // User information
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phoneNumber: maskPhoneNumber(user.phoneNumber),
        role: user.role,
        languagePreference: user.languagePreference,
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified || false,
        isPhoneVerified: user.isPhoneVerified || false,
        profilePicture: user.profilePicture || null,
        walletBalance: user.walletBalance || 0,
        location: user.location || null,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        metadata: {
          loginAttempts: user.loginAttempts || 0,
          lastLoginIP: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
          deviceInfo: {
            platform: req.get("sec-ch-ua-platform") || "unknown",
            mobile: req.get("sec-ch-ua-mobile") === "?1",
          },
        },
      },

      // Session information
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 86400, // 24 hours in seconds
        expires_at: Math.floor(accessTokenExpiresAt.getTime() / 1000),
        refresh_token_expires_at: Math.floor(
          refreshTokenExpiresAt.getTime() / 1000
        ),
        token_type: "Bearer",
        user: {
          id: user._id,
          aud: "labor2hire-client",
          role: user.role,
          account_status: user.accountStatus,
          phone: maskPhoneNumber(user.phoneNumber),
          confirmed_at: user.createdAt,
          last_sign_in_at: user.lastLogin,
          app_metadata: {
            provider: "phone",
            providers: ["phone"],
          },
          user_metadata: {
            name: user.name,
            language_preference: user.languagePreference,
            role: user.role,
          },
        },
      },

      // Authentication tokens (for backward compatibility)
      accessToken,
      refreshToken,

      // Additional session metadata
      sessionMetadata: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loginTimestamp: new Date().toISOString(),
        expiresAt: accessTokenExpiresAt.toISOString(),
        refreshExpiresAt: refreshTokenExpiresAt.toISOString(),
        issuer: "labor2hire-backend",
        audience: "labor2hire-client",
        loginMethod: "phone_password",
        securityLevel: "standard",
        mfaEnabled: false, // TODO: Implement MFA
        permissions: await getUserPermissions(user.role, user.accountStatus),
        features: await getUserFeatures(user.role, user.accountStatus),
      },
    },
  });
});

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 * @access Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new AuthenticationError("Refresh token not provided");
  }
  const { accessToken, accessTokenData, user } =
    await authService.refreshAccessToken(refreshToken);
  // Register the new access token session
  const deviceFingerprint =
    req.get("X-Device-Fingerprint") ||
    `${req.ip}_${req.get("User-Agent") || "unknown"}`;

  tokenSessionManager.registerSession(
    user._id,
    accessTokenData.tokenId,
    deviceFingerprint
  );

  // Calculate token expiration times
  const accessTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: {
      // User information
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phoneNumber: maskPhoneNumber(user.phoneNumber),
        role: user.role,
        languagePreference: user.languagePreference,
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified || false,
        isPhoneVerified: user.isPhoneVerified || false,
        profilePicture: user.profilePicture || null,
        walletBalance: user.walletBalance || 0,
        location: user.location || null,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      // Session information
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 86400, // 24 hours in seconds
        expires_at: Math.floor(accessTokenExpiresAt.getTime() / 1000),
        refresh_token_expires_at: Math.floor(
          refreshTokenExpiresAt.getTime() / 1000
        ),
        token_type: "Bearer",
        user: {
          id: user._id,
          aud: "labor2hire-client",
          role: user.role,
          account_status: user.accountStatus,
          phone: maskPhoneNumber(user.phoneNumber),
          confirmed_at: user.createdAt,
          last_sign_in_at: user.lastLogin,
          app_metadata: {
            provider: "phone",
            providers: ["phone"],
          },
          user_metadata: {
            name: user.name,
            language_preference: user.languagePreference,
            role: user.role,
          },
        },
      },

      // Authentication tokens (for backward compatibility)
      accessToken,

      // Additional session metadata
      sessionMetadata: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshTimestamp: new Date().toISOString(),
        expiresAt: accessTokenExpiresAt.toISOString(),
        refreshExpiresAt: refreshTokenExpiresAt.toISOString(),
        issuer: "labor2hire-backend",
        audience: "labor2hire-client",
        refreshMethod: "refresh_token",
        securityLevel: "standard",
        mfaEnabled: false, // TODO: Implement MFA
        permissions: await getUserPermissions(user.role, user.accountStatus),
        features: await getUserFeatures(user.role, user.accountStatus),
      },
    },
  });
});

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Invalidate all sessions for the user
  await tokenSessionManager.invalidateUserSessions(userId);

  await authService.logoutUser(userId);

  // Clear refresh token cookie
  res.clearCookie("refreshToken");

  logger.info("User logout successful", { userId });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await authService.getUserProfile(userId);

  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: maskPhoneNumber(user.phoneNumber),
        role: user.role,
        languagePreference: user.languagePreference,
        accountStatus: user.accountStatus,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});

/**
 * Update user profile - auth fields only
 * @route PUT /api/auth/profile
 * @access Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const userId = req.user.id;
  const updateData = req.body;

  const user = await authService.updateUserProfile(userId, updateData);

  logger.info("User profile updated", { userId });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: maskPhoneNumber(user.phoneNumber),
        role: user.role,
        languagePreference: user.languagePreference,
        accountStatus: user.accountStatus,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});

/**
 * Get users by IDs (for internal service calls)
 * @route POST /api/auth/users/bulk
 * @access Private - Admin/Employer
 */
export const getUsersByIds = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const { userIds } = req.body;

  // Authorization check
  if (req.user.role !== "admin" && req.user.role !== "employer") {
    throw new AuthenticationError("Insufficient permissions");
  }

  const users = await authService.getUsersByIds(userIds);

  res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: {
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        phoneNumber:
          req.user.role === "admin"
            ? user.phoneNumber
            : maskPhoneNumber(user.phoneNumber),
        role: user.role,
        accountStatus: user.accountStatus,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
      })),
    },
  });
});

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const { phoneNumber } = req.body;

  const resetToken = await authService.generatePasswordResetToken(phoneNumber);

  // In a real application, you would send this token via SMS
  // For now, we'll just log it (this should be removed in production)
  logger.info("Password reset token generated", {
    phoneNumber: maskPhoneNumber(phoneNumber),
    resetToken:
      process.env.NODE_ENV === "development" ? resetToken : "[HIDDEN]",
  });

  res.status(200).json({
    success: true,
    message: "Password reset token sent to your phone number",
    ...(process.env.NODE_ENV === "development" && { resetToken }), // Only in development
  });
});

/**
 * Reset password
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const { resetToken, newPassword } = req.body;

  await authService.resetPassword(resetToken, newPassword);

  logger.info("Password reset completed");

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

/**
 * Change password (for authenticated users)
 * @route PUT /api/auth/change-password
 * @access Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed", errors.array());
  }

  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  // First, verify current password by attempting login
  const user = await authService.getUserProfile(userId);

  try {
    await authService.loginUser(user.phoneNumber, currentPassword);
  } catch (error) {
    throw new AuthenticationError("Current password is incorrect");
  }

  // Generate reset token and use it to change password
  const resetToken = await authService.generatePasswordResetToken(
    user.phoneNumber
  );
  await authService.resetPassword(resetToken, newPassword);

  logger.info("Password changed successfully", { userId });

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

/**
 * Verify token (for middleware use)
 * @route GET /api/auth/verify
 * @access Private
 */
export const verifyToken = asyncHandler(async (req, res) => {
  const user = req.user; // Set by auth middleware

  res.status(200).json({
    success: true,
    message: "Token is valid",
    data: {
      user: {
        id: user.id,
        role: user.role,
        accountStatus: user.accountStatus,
      },
    },
  });
});

/**
 * Update user location
 * @route PUT /api/auth/location
 * @access Private
 */
export const updateLocation = asyncHandler(async (req, res) => {
  const { coordinates } = req.body;
  const userId = req.user.id;

  logger.info("Location update request received", {
    userId,
    coordinates: coordinates ? coordinates.length : "null",
  });

  // For now, this is a placeholder
  // In a full implementation, this would call the geolocation service
  res.status(200).json({
    success: true,
    message:
      "Location update endpoint available - to be integrated with geolocation service",
    data: {
      userId,
      coordinates,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Toggle user active status
 * @route PUT /api/auth/toggle-status
 * @access Private
 */
export const toggleActiveStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  logger.info("Toggle active status request received", { userId });

  // For now, this is a placeholder
  // In a full implementation, this would update user status
  res.status(200).json({
    success: true,
    message: "Toggle active status endpoint available - to be implemented",
    data: {
      userId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Helper function to mask phone number
 * @param {string} phoneNumber - Phone number to mask
 * @returns {string} - Masked phone number
 */
const maskPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
  return phoneNumber.slice(0, 2) + "****" + phoneNumber.slice(-2);
};

/**
 * Get user permissions based on role and account status
 * @param {string} role - User role
 * @param {string} accountStatus - Account status
 * @returns {Promise<Array>} User permissions
 */
const getUserPermissions = async (role, accountStatus) => {
  const basePermissions = [];

  // Base permissions for all users
  basePermissions.push("read:profile", "update:profile", "read:notifications");

  // Role-based permissions
  switch (role) {
    case "laborer":
      basePermissions.push(
        "create:job_application",
        "read:job_listings",
        "update:availability",
        "read:earnings",
        "create:labor_profile"
      );
      break;
    case "employer":
      basePermissions.push(
        "create:job_listing",
        "read:job_applications",
        "create:job_offer",
        "read:laborer_profiles",
        "manage:payments"
      );
      break;
    case "admin":
      basePermissions.push(
        "manage:users",
        "manage:jobs",
        "manage:payments",
        "read:analytics",
        "manage:system"
      );
      break;
  }

  // Account status restrictions
  if (accountStatus === "suspended") {
    return ["read:profile"]; // Very limited permissions
  }

  if (accountStatus === "pending_verification") {
    return basePermissions.filter(
      (p) => !p.includes("create:job") && !p.includes("manage:")
    );
  }

  return basePermissions;
};

/**
 * Get user features based on role and account status
 * @param {string} role - User role
 * @param {string} accountStatus - Account status
 * @returns {Promise<Object>} User features
 */
const getUserFeatures = async (role, accountStatus) => {
  const features = {
    messaging: accountStatus === "active",
    notifications: true,
    profileComplete: false, // TODO: Check if profile is complete
    canCreateJobs: false,
    canApplyToJobs: false,
    canManagePayments: false,
    hasWallet: true,
    canWithdraw: accountStatus === "active",
    canDeposit: accountStatus === "active",
    geoLocation: true,
    realTimeTracking: false,
    premiumFeatures: false, // TODO: Implement premium features
  };

  switch (role) {
    case "laborer":
      features.canApplyToJobs = accountStatus === "active";
      features.realTimeTracking = accountStatus === "active";
      break;
    case "employer":
      features.canCreateJobs = accountStatus === "active";
      features.canManagePayments = accountStatus === "active";
      break;
    case "admin":
      features.canCreateJobs = true;
      features.canApplyToJobs = true;
      features.canManagePayments = true;
      features.realTimeTracking = true;
      features.premiumFeatures = true;
      break;
  }

  return features;
};
