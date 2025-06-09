/**
 * Authentication Validators
 * Validation schemas and rules for authentication endpoints
 */

import { body, param, query } from "express-validator";

/**
 * Validation for user registration
 */
export const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name must contain only letters and spaces"),

  body("phoneNumber")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit Indian mobile number"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("role")
    .optional()
    .isIn(["admin", "employer", "laborer"])
    .withMessage("Role must be one of: admin, employer, laborer"),

  body("languagePreference")
    .optional()
    .isIn(["en", "hi", "ta", "te", "bn", "mr", "gu"])
    .withMessage(
      "Language preference must be one of: en, hi, ta, te, bn, mr, gu"
    ),
];

/**
 * Validation for user login
 */
export const loginValidation = [
  body("phoneNumber")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit Indian mobile number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1 })
    .withMessage("Password cannot be empty"),
];

/**
 * Validation for profile update
 */
export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name must contain only letters and spaces"),

  body("languagePreference")
    .optional()
    .isIn(["en", "hi", "ta", "te", "bn", "mr", "gu"])
    .withMessage(
      "Language preference must be one of: en, hi, ta, te, bn, mr, gu"
    ),

  body("profilePicture")
    .optional()
    .isURL()
    .withMessage("Profile picture must be a valid URL")
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage(
      "Profile picture must be a valid image URL (jpg, jpeg, png, gif, webp)"
    ),
];

/**
 * Validation for location update
 */
export const updateLocationValidation = [
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a number between -180 and 180"),

  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a number between -90 and 90"),
];

/**
 * Validation for bulk user retrieval
 */
export const getUsersByIdsValidation = [
  body("userIds")
    .isArray({ min: 1, max: 100 })
    .withMessage("userIds must be an array with 1 to 100 items"),

  body("userIds.*")
    .isMongoId()
    .withMessage("Each user ID must be a valid MongoDB ObjectId"),
];

/**
 * Validation for forgot password
 */
export const forgotPasswordValidation = [
  body("phoneNumber")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit Indian mobile number"),
];

/**
 * Validation for password reset
 */
export const resetPasswordValidation = [
  body("resetToken")
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid reset token format"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

/**
 * Validation for password change
 */
export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("newPassword").custom((value, { req }) => {
    if (value === req.body.currentPassword) {
      throw new Error("New password must be different from current password");
    }
    return true;
  }),
];

/**
 * Validation for refresh token
 */
export const refreshTokenValidation = [
  body("refreshToken")
    .optional()
    .notEmpty()
    .withMessage("Refresh token cannot be empty"),
];

/**
 * Custom validation middleware for phone number sanitization
 */
export const sanitizePhoneNumber = (req, res, next) => {
  if (req.body.phoneNumber) {
    // Remove any non-digit characters and ensure it starts with correct digits
    let phoneNumber = req.body.phoneNumber.replace(/\D/g, "");

    // Handle cases where country code is included
    if (phoneNumber.length === 12 && phoneNumber.startsWith("91")) {
      phoneNumber = phoneNumber.slice(2);
    } else if (phoneNumber.length === 13 && phoneNumber.startsWith("+91")) {
      phoneNumber = phoneNumber.slice(3);
    }

    req.body.phoneNumber = phoneNumber;
  }
  next();
};

/**
 * Custom validation middleware for coordinate sanitization
 */
export const sanitizeCoordinates = (req, res, next) => {
  if (req.body.longitude !== undefined) {
    req.body.longitude = parseFloat(req.body.longitude);
  }
  if (req.body.latitude !== undefined) {
    req.body.latitude = parseFloat(req.body.latitude);
  }
  next();
};

/**
 * Custom validation middleware for user IDs sanitization
 */
export const sanitizeUserIds = (req, res, next) => {
  if (req.body.userIds && Array.isArray(req.body.userIds)) {
    // Remove duplicates and invalid IDs
    req.body.userIds = [
      ...new Set(
        req.body.userIds.filter(
          (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
        )
      ),
    ];
  }
  next();
};

/**
 * Rate limiting validation for sensitive operations
 */
export const sensitiveOperationValidation = [
  // Additional custom validation can be added here
  body().custom((value, { req }) => {
    // Check if this is a sensitive operation during business hours
    const hour = new Date().getHours();
    const isSensitiveTime = hour >= 22 || hour <= 6; // 10 PM to 6 AM

    if (
      isSensitiveTime &&
      (req.route.path.includes("reset") ||
        req.route.path.includes("change-password"))
    ) {
      // Could implement additional security measures for sensitive times
      req.sensitiveTimeOperation = true;
    }

    return true;
  }),
];

/**
 * Profile picture validation helper
 */
export const validateProfilePicture = [
  body("profilePicture")
    .optional()
    .custom(async (value) => {
      if (!value) return true;

      // Check if URL is accessible and returns an image
      try {
        const response = await fetch(value, { method: "HEAD" });
        const contentType = response.headers.get("content-type");

        if (!contentType || !contentType.startsWith("image/")) {
          throw new Error("URL must point to a valid image");
        }

        // Check file size (if Content-Length header is present)
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
          // 5MB limit
          throw new Error("Image size must be less than 5MB");
        }

        return true;
      } catch (error) {
        throw new Error("Invalid image URL or image is too large");
      }
    }),
];

/**
 * Business logic validation for role-based operations
 */
export const roleBasedValidation = (allowedRoles = []) => {
  return [
    body().custom((value, { req }) => {
      if (req.user && allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          throw new Error(
            `This operation is only allowed for: ${allowedRoles.join(", ")}`
          );
        }
      }
      return true;
    }),
  ];
};

/**
 * Validation for account status checks
 */
export const accountStatusValidation = [
  body().custom((value, { req }) => {
    if (req.user) {
      if (req.user.accountStatus === "suspended") {
        throw new Error(
          "Account is suspended. Contact support for assistance."
        );
      }
      if (req.user.accountStatus === "banned") {
        throw new Error("Account is banned. Contact support for assistance.");
      }
      if (req.user.accountStatus === "pending") {
        throw new Error(
          "Account is pending verification. Complete your profile to activate."
        );
      }
    }
    return true;
  }),
];

/**
 * Location-based validation (for location-sensitive operations)
 */
export const locationValidation = [
  body("location")
    .optional()
    .custom((value) => {
      if (value && value.coordinates) {
        const [longitude, latitude] = value.coordinates;
        if (longitude < -180 || longitude > 180) {
          throw new Error("Invalid longitude value");
        }
        if (latitude < -90 || latitude > 90) {
          throw new Error("Invalid latitude value");
        }
      }
      return true;
    }),
];

/**
 * Time-based validation (for operations that should be restricted by time)
 */
export const timeBasedValidation = [
  body().custom((value, { req }) => {
    const hour = new Date().getHours();
    const isMaintenanceTime = hour >= 2 && hour <= 4; // 2 AM to 4 AM maintenance window

    if (isMaintenanceTime && req.route.path.includes("register")) {
      throw new Error(
        "Registration is temporarily unavailable during maintenance hours (2 AM - 4 AM)"
      );
    }

    return true;
  }),
];

/**
 * Export all validation functions
 */
export const authValidators = {
  register: [sanitizePhoneNumber, ...registerValidation, timeBasedValidation],
  login: [sanitizePhoneNumber, ...loginValidation],
  updateProfile: [
    ...updateProfileValidation,
    validateProfilePicture,
    accountStatusValidation,
  ],
  updateLocation: [
    sanitizeCoordinates,
    ...updateLocationValidation,
    accountStatusValidation,
  ],
  getUsersByIds: [
    sanitizeUserIds,
    ...getUsersByIdsValidation,
    roleBasedValidation(["admin", "employer"]),
  ],
  forgotPassword: [sanitizePhoneNumber, ...forgotPasswordValidation],
  resetPassword: [...resetPasswordValidation, sensitiveOperationValidation],
  changePassword: [
    ...changePasswordValidation,
    accountStatusValidation,
    sensitiveOperationValidation,
  ],
  refreshToken: [...refreshTokenValidation],
};
