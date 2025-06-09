/**
 * @fileoverview Core User model for authentication only
 * @module models/User
 * @author Labor2Hire Team
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

/**
 * Core User Schema - Authentication Only
 * This model handles only authentication-related data
 * Profile data is handled by the UserProfile model
 */
const userSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (phone) {
          const cleanPhone = phone.replace(/\D/g, "");
          return cleanPhone.length === 10;
        },
        message: "Phone number must be exactly 10 digits",
      },
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
      validate: {
        validator: function (name) {
          return /^[a-zA-Z\s'-]+$/.test(name);
        },
        message:
          "Name can only contain letters, spaces, apostrophes, and hyphens",
      },
    },

    role: {
      type: String,
      enum: {
        values: ["admin", "employer", "laborer"],
        message: "Role must be one of: admin, employer, laborer",
      },
      required: [true, "User role is required"],
      index: true,
    },

    hashedPassword: {
      type: String,
      required: [true, "Password is required"],
      minlength: [60, "Invalid password hash"],
      select: false,
    },

    // Authentication related fields only
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated", "pending_verification"],
      default: "pending_verification",
      index: true,
    },

    languagePreference: {
      type: String,
      default: "en",
      enum: ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi"],
      trim: true,
    },

    // Security fields
    loginAttempts: {
      type: Number,
      default: 0,
      max: [
        10,
        "Account temporarily locked due to too many failed login attempts",
      ],
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    // Password reset fields
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // OTP for phone verification
    otp: {
      code: {
        type: String,
        default: null,
        validate: {
          validator: function (code) {
            if (!code) return true;
            return /^\d{6}$/.test(code);
          },
          message: "OTP must be a 6-digit number",
        },
      },
      expiry: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
        max: [5, "Maximum OTP attempts exceeded"],
      },
    },

    // Verification status
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.hashedPassword;
        delete ret.otp;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.refreshToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.hashedPassword;
        delete ret.otp;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.refreshToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ role: 1, accountStatus: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  try {
    if (
      this.isModified("hashedPassword") &&
      !this.hashedPassword.startsWith("$2")
    ) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
      this.hashedPassword = await bcrypt.hash(this.hashedPassword, saltRounds);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for validation
userSchema.pre("validate", function (next) {
  if (this.phoneNumber) {
    this.phoneNumber = this.phoneNumber.replace(/\D/g, "");
  }
  next();
});

/**
 * Instance Methods
 */

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    if (!this.hashedPassword) {
      throw new Error("No password set for this user");
    }
    return await bcrypt.compare(candidatePassword, this.hashedPassword);
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);

  this.otp = {
    code: otpCode,
    expiry: new Date(Date.now() + expiryMinutes * 60 * 1000),
    attempts: 0,
  };

  return otpCode;
};

// Verify OTP
userSchema.methods.verifyOTP = function (candidateCode) {
  if (!this.otp.code || !this.otp.expiry) {
    return false;
  }

  if (this.otp.expiry < new Date()) {
    this.clearOTP();
    return false;
  }

  if (this.otp.attempts >= 5) {
    this.clearOTP();
    return false;
  }

  this.otp.attempts += 1;

  if (this.otp.code === candidateCode) {
    this.clearOTP();
    this.isPhoneVerified = true;
    return true;
  }

  return false;
};

// Clear OTP
userSchema.methods.clearOTP = function () {
  this.otp = {
    code: null,
    expiry: null,
    attempts: 0,
  };
};

/**
 * Static Methods
 */

// Find active users by role
userSchema.statics.findActiveByRole = function (role) {
  return this.find({
    role,
    accountStatus: "active",
  });
};

// Create user with validation
userSchema.statics.createUser = async function (userData) {
  const user = new this(userData);
  await user.validate();
  return await user.save();
};

const User = mongoose.model("User", userSchema);

export default User;
