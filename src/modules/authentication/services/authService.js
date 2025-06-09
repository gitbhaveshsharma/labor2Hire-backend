/**
 * Authentication Service
 * Handles authentication logic, password hashing, token generation, and user management
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { logger } from "../../../config/logger.js";
import { tokenSessionManager } from "../../../middlewares/tokenSecurity.js";
import {
  AppError,
  AuthenticationError,
  ValidationError,
} from "../../../middlewares/errorHandler.js";

/**
 * Helper function to validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password is valid
 */
function isValidPassword(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumbers &&
    hasSpecialChar
  );
}

/**
 * Helper function to mask phone number for logging
 * @param {string} phoneNumber - Phone number to mask
 * @returns {string} - Masked phone number
 */
function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
  return phoneNumber.slice(0, 2) + "****" + phoneNumber.slice(-2);
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  try {
    const saltRounds = 12; // Higher for better security
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    logger.error("Error hashing password:", { error: error.message });
    throw new AppError("Password processing failed", 500);
  }
};

/**
 * Compare plain text password with hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
export const comparePasswords = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error("Error comparing passwords:", { error: error.message });
    throw new AppError("Password verification failed", 500);
  }
};

/**
 * Generate JWT access token with enhanced security
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @param {string} accountStatus - User account status
 * @param {Object} options - Additional options
 * @returns {Object} - Token data with JTI for session tracking
 */
export const generateAccessToken = (
  userId,
  role,
  accountStatus,
  options = {}
) => {
  try {
    const tokenId = crypto.randomUUID(); // Generate unique JTI for session tracking

    const payload = {
      id: userId,
      role: role,
      accountStatus: accountStatus,
      type: "access",
      jti: tokenId, // JWT ID for token tracking and invalidation
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      issuer: "labor2hire-backend",
      audience: "labor2hire-client",
    });

    return {
      token,
      tokenId,
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    };
  } catch (error) {
    logger.error("Error generating access token:", { error: error.message });
    throw new AppError("Token generation failed", 500);
  }
};

/**
 * Generate JWT refresh token with enhanced security
 * @param {string} userId - User ID
 * @returns {Object} - Refresh token data with JTI
 */
export const generateRefreshToken = (userId) => {
  try {
    const tokenId = crypto.randomUUID(); // Generate unique JTI for session tracking

    const payload = {
      id: userId,
      type: "refresh",
      jti: tokenId,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      issuer: "labor2hire-backend",
      audience: "labor2hire-client",
    });

    return {
      token,
      tokenId,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    };
  } catch (error) {
    logger.error("Error generating refresh token:", { error: error.message });
    throw new AppError("Refresh token generation failed", 500);
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret
 * @returns {object} - Decoded token payload
 */
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid token");
    } else {
      throw new AuthenticationError("Token verification failed");
    }
  }
};

/**
 * Register a new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} - Created user object (without sensitive data)
 */
export const registerUser = async (userData) => {
  try {
    const { name, phoneNumber, password, role, languagePreference } = userData; // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      throw new ValidationError(
        "You already have an account with this phone number. Please use login instead."
      );
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      throw new ValidationError(
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user - removed wallet and location fields
    const user = new User({
      name: name.trim(),
      phoneNumber,
      hashedPassword,
      role: role || "laborer",
      languagePreference: languagePreference || "en",
      accountStatus: role === "admin" ? "active" : "pending_verification",
    });
    await user.save();

    logger.info("User registered successfully", {
      userId: user._id,
      phoneNumber: maskPhoneNumber(phoneNumber),
      role: user.role,
    });

    return user;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AppError) {
      throw error;
    }
    logger.error("Error registering user:", { error: error.message });
    throw new AppError("User registration failed", 500);
  }
};

/**
 * Authenticate user login
 * @param {string} phoneNumber - User's phone number
 * @param {string} password - User's password
 * @returns {Promise<object>} - User data and tokens
 */
export const loginUser = async (phoneNumber, password) => {
  try {
    // Find user by phone number
    const user = await User.findOne({ phoneNumber }).select(
      "+hashedPassword +loginAttempts +lockUntil"
    );

    if (!user) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new AuthenticationError(
        "Account is temporarily locked due to too many failed login attempts"
      );
    }

    // Check account status
    if (user.accountStatus === "suspended") {
      throw new AuthenticationError("Account is suspended");
    } else if (user.accountStatus === "banned") {
      throw new AuthenticationError("Account is banned");
    }

    // Compare password
    const isPasswordValid = await comparePasswords(
      password,
      user.hashedPassword
    );

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new AuthenticationError("Invalid credentials");
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date(); // Generate tokens with enhanced security
    const accessTokenData = generateAccessToken(
      user._id,
      user.role,
      user.accountStatus
    );
    const refreshTokenData = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshTokenData.token;
    await user.save();

    logger.info("User logged in successfully", {
      userId: user._id,
      phoneNumber: maskPhoneNumber(phoneNumber),
      role: user.role,
    });

    return {
      user: user.toJSON(),
      accessToken: accessTokenData.token,
      refreshToken: refreshTokenData.token,
      accessTokenData,
      refreshTokenData,
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AppError) {
      throw error;
    }
    logger.error("Error during login:", { error: error.message });
    throw new AppError("Login failed", 500);
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} - New access token
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user and verify refresh token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new AuthenticationError("Invalid refresh token");
    }

    // Check account status
    if (user.accountStatus !== "active") {
      throw new AuthenticationError("Account is not active");
    }

    // Generate new access token with enhanced security
    const accessTokenData = generateAccessToken(
      user._id,
      user.role,
      user.accountStatus
    );

    return {
      accessToken: accessTokenData.token,
      accessTokenData,
      user: user.toJSON(),
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    logger.error("Error refreshing token:", { error: error.message });
    throw new AppError("Token refresh failed", 500);
  }
};

/**
 * Logout user by invalidating refresh token
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const logoutUser = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 },
    });

    logger.info("User logged out successfully", { userId });
  } catch (error) {
    logger.error("Error during logout:", { error: error.message });
    throw new AppError("Logout failed", 500);
  }
};

/**
 * Generate password reset token
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Reset token
 */
export const generatePasswordResetToken = async (phoneNumber) => {
  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token and expiration (15 minutes)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    logger.info("Password reset token generated", {
      userId: user._id,
      phoneNumber: maskPhoneNumber(phoneNumber),
    });

    return resetToken; // Return unhashed token to send to user
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Error generating reset token:", { error: error.message });
    throw new AppError("Reset token generation failed", 500);
  }
};

/**
 * Reset password using reset token
 * @param {string} resetToken - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const resetPassword = async (resetToken, newPassword) => {
  try {
    // Hash the token to compare with stored version
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AuthenticationError("Invalid or expired reset token");
    }

    // Validate new password
    if (!isValidPassword(newPassword)) {
      throw new ValidationError(
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    user.hashedPassword = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Invalidate existing sessions

    // Reset login attempts if any
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    logger.info("Password reset successfully", { userId: user._id });
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof ValidationError ||
      error instanceof AppError
    ) {
      throw error;
    }
    logger.error("Error resetting password:", { error: error.message });
    throw new AppError("Password reset failed", 500);
  }
};

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} - User profile
 */
export const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user.toJSON();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Error fetching user profile:", { error: error.message });
    throw new AppError("Failed to fetch user profile", 500);
  }
};

/**
 * Update user profile - only auth-related fields
 * @param {string} userId - User ID
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Updated user profile
 */
export const updateUserProfile = async (userId, updateData) => {
  try {
    // Filter allowed fields for update - removed wallet and location
    const allowedFields = ["name", "languagePreference"];
    const filteredData = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    logger.info("User profile updated", { userId });
    return user.toJSON();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Error updating user profile:", { error: error.message });
    throw new AppError("Profile update failed", 500);
  }
};
