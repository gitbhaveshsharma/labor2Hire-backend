/**
 * @fileoverview UserProfile model for Indian street laborers
 * @module models/UserProfile
 * @author Labor2Hire Team
 */

import mongoose from "mongoose";
import { encrypt, decrypt, safeDecrypt } from "../utils/encryption.js";

const { Schema } = mongoose;

/**
 * Personal Information Sub-Schema
 */
const personalInfoSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, "Middle name cannot exceed 50 characters"],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (date) {
          const today = new Date();
          const age = today.getFullYear() - date.getFullYear();
          return age >= 16 && age <= 100;
        },
        message: "Age must be between 16 and 100 years",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other", "prefer-not-to-say"],
        message: "Gender must be male, female, other, or prefer-not-to-say",
      },
    },
    nationality: {
      type: String,
      trim: true,
      default: "Indian",
      enum: {
        values: ["Indian"],
        message: "Only Indian nationality is supported",
      },
    },
    maritalStatus: {
      type: String,
      enum: {
        values: [
          "single",
          "married",
          "divorced",
          "widowed",
          "prefer-not-to-say",
        ],
        message: "Invalid marital status",
      },
    },
  },
  { _id: false }
);

/**
 * Contact Information Sub-Schema
 */
const contactInfoSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email) {
          if (!email) return true; // Email validation will be handled in pre-save middleware for role-based requirements
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    alternateEmail: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email) {
          if (!email) return true;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        message: "Please provide a valid alternate email address",
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (phone) {
          const cleanPhone = phone.replace(/\D/g, "");
          return cleanPhone.length >= 10 && cleanPhone.length <= 15;
        },
        message: "Phone number must be between 10 and 15 digits",
      },
    },
    alternatePhoneNumber: {
      type: String,
      validate: {
        validator: function (phone) {
          if (!phone) return true;
          const cleanPhone = phone.replace(/\D/g, "");
          return cleanPhone.length >= 10 && cleanPhone.length <= 15;
        },
        message: "Alternate phone number must be between 10 and 15 digits",
      },
    },
    socialMedia: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
    },
  },
  { _id: false }
);

/**
 * Location Sub-Schema with Geospatial Support
 */
const locationSchema = new Schema(
  {
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [100, "Street cannot exceed 100 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, "City cannot exceed 50 characters"],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, "State cannot exceed 50 characters"],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, "Country cannot exceed 50 characters"],
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: [20, "Zip code cannot exceed 20 characters"],
      },
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
        validate: {
          validator: function (coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: "Invalid coordinates format [longitude, latitude]",
        },
      },
    },
    timezone: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Professional Information Sub-Schema - Simplified for Street Laborers
 */
const professionalInfoSchema = new Schema(
  {
    workCategory: {
      type: String,
      enum: {
        values: [
          "construction",
          "cleaning",
          "gardening",
          "painting",
          "plumbing",
          "electrical",
          "carpentry",
          "masonry",
          "loading-unloading",
          "delivery",
          "cooking",
          "household-help",
          "other",
        ],
        message: "Invalid work category",
      },
    },
    skills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [50, "Skill name cannot exceed 50 characters"],
        },
        level: {
          type: String,
          enum: {
            values: ["beginner", "experienced", "expert"],
            message: "Invalid skill level",
          },
          default: "beginner",
        },
        description: {
          type: String,
          maxlength: [200, "Skill description cannot exceed 200 characters"],
        },
      },
    ],
    languages: [
      {
        language: {
          type: String,
          required: true,
          trim: true,
          enum: {
            values: [
              "Hindi",
              "English",
              "Tamil",
              "Telugu",
              "Marathi",
              "Bengali",
              "Gujarati",
              "Kannada",
              "Malayalam",
              "Punjabi",
              "Urdu",
              "Other",
            ],
            message: "Invalid language",
          },
        },
        proficiency: {
          type: String,
          enum: {
            values: ["basic", "conversational", "fluent", "native"],
            message: "Invalid language proficiency level",
          },
          default: "basic",
        },
      },
    ],
    availability: {
      type: String,
      enum: {
        values: ["daily", "weekly", "part-time", "flexible", "not-available"],
        message: "Invalid availability status",
      },
      default: "not-available",
    },
    dailyRate: {
      amount: { type: Number, min: [0, "Daily rate cannot be negative"] },
      currency: {
        type: String,
        default: "INR",
        enum: {
          values: ["INR"],
          message: "Only INR currency is supported",
        },
      },
    },
  },
  { _id: false }
);

/**
 * User Preferences Sub-Schema
 */
const preferencesSchema = new Schema(
  {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      jobAlerts: { type: Boolean, default: true },
      messageAlerts: { type: Boolean, default: true },
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: {
          values: ["public", "private", "connections-only"],
          message: "Invalid profile visibility setting",
        },
        default: "public",
      },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showLocation: { type: Boolean, default: true },
    },
    jobPreferences: {
      preferredLocations: [
        {
          type: String,
          trim: true,
          maxlength: [100, "Location cannot exceed 100 characters"],
        },
      ],
      maxCommuteDitance: {
        type: Number,
        min: [0, "Commute distance cannot be negative"],
        max: [100, "Commute distance cannot exceed 100 km"],
        default: 20,
      },
      workType: {
        type: String,
        enum: {
          values: ["on-site", "flexible-location"],
          message: "Invalid work type preference",
        },
        default: "on-site",
      },
      expectedDailyWage: {
        min: {
          type: Number,
          min: [100, "Minimum daily wage cannot be less than ₹100"],
        },
        max: {
          type: Number,
          min: [100, "Maximum daily wage cannot be less than ₹100"],
        },
        currency: {
          type: String,
          default: "INR",
          enum: {
            values: ["INR"],
            message: "Only INR currency is supported",
          },
        },
      },
    },
  },
  { _id: false }
);

/**
 * Verification Sub-Schema for Indian Documents
 */
const verificationSchema = new Schema({
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isAadharVerified: { type: Boolean, default: false },
  isPanVerified: { type: Boolean, default: false },

  documents: [
    {
      type: {
        type: String,
        enum: {
          values: [
            "aadhar-card",
            "pan-card",
            "voter-id",
            "driving-license",
            "ration-card",
            "other",
          ],
          message: "Invalid document type",
        },
        required: true,
      },
      documentNumber: {
        type: String,
        required: true,
        set: function (value) {
          // Encrypt document number before saving
          try {
            return encrypt(value);
          } catch (error) {
            console.error("Encryption error in setter:", error);
            throw new Error("Failed to encrypt document number");
          }
        },
        get: function (value) {
          // Decrypt document number when retrieving
          if (!value) return value;
          try {
            const result = safeDecrypt(value);
            if (!result.success) {
              console.error("Decryption error in getter:", {
                error: result.error,
                analysis: result.analysis,
                suggestion: result.suggestion,
              });
              // Return a safe placeholder instead of throwing
              return "***DECRYPTION_ERROR***";
            }
            return result.data;
          } catch (error) {
            console.error("Decryption error in getter:", error);
            // Return a safe placeholder instead of throwing
            return "***DECRYPTION_ERROR***";
          }
        },
      },
      issuingState: {
        type: String,
        required: true,
        trim: true,
        enum: {
          values: [
            "Andhra Pradesh",
            "Arunachal Pradesh",
            "Assam",
            "Bihar",
            "Chhattisgarh",
            "Goa",
            "Gujarat",
            "Haryana",
            "Himachal Pradesh",
            "Jharkhand",
            "Karnataka",
            "Kerala",
            "Madhya Pradesh",
            "Maharashtra",
            "Manipur",
            "Meghalaya",
            "Mizoram",
            "Nagaland",
            "Odisha",
            "Punjab",
            "Rajasthan",
            "Sikkim",
            "Tamil Nadu",
            "Telangana",
            "Tripura",
            "Uttar Pradesh",
            "Uttarakhand",
            "West Bengal",
            "Delhi",
            "Jammu and Kashmir",
            "Ladakh",
            "Puducherry",
            "Chandigarh",
            "Dadra and Nagar Haveli and Daman and Diu",
            "Lakshadweep",
            "Andaman and Nicobar Islands",
          ],
          message: "Invalid Indian state",
        },
      },
      issueDate: {
        type: Date,
      },
      expiryDate: {
        type: Date,
        validate: {
          validator: function (date) {
            // Only some documents have expiry dates
            if (!date) return true;
            return date > new Date();
          },
          message: "Document must not be expired",
        },
      },
      verificationStatus: {
        type: String,
        enum: {
          values: ["pending", "verified", "rejected", "pending_reupload"],
          message: "Invalid verification status",
        },
        default: "pending",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      verifiedAt: {
        type: Date,
      },
    },
  ],

  verificationLevel: {
    type: String,
    enum: {
      values: ["none", "basic", "standard", "premium"],
      message: "Invalid verification level",
    },
    default: "none",
  },
});

/**
 * Main UserProfile Schema
 */
const userProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },

    personalInfo: {
      type: personalInfoSchema,
      required: [true, "Personal information is required"],
    },
    contactInfo: {
      type: contactInfoSchema,
      required: [true, "Contact information is required"],
    },
    location: {
      type: locationSchema,
    },

    professionalInfo: {
      type: professionalInfoSchema,
    },

    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },

    verification: {
      type: verificationSchema,
      default: () => ({}),
    },

    profileCompleteness: {
      type: Number,
      min: [0, "Profile completeness cannot be negative"],
      max: [100, "Profile completeness cannot exceed 100"],
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastProfileUpdate: {
      type: Date,
      default: Date.now,
    },

    profileViews: {
      type: Number,
      default: 0,
      min: [0, "Profile views cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform: function (doc, ret) {
        // Remove sensitive encrypted data from JSON output while preserving document IDs
        if (ret.verification && ret.verification.documents) {
          ret.verification.documents = ret.verification.documents.map(
            (docData) => ({
              ...docData,
              _id: docData._id, // Explicitly preserve the document ID
              documentNumber: docData.documentNumber
                ? "***ENCRYPTED***"
                : docData.documentNumber,
            })
          );
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      getters: true,
    },
  }
);

/**
 * Indexes for Performance Optimization
 */
userProfileSchema.index({ userId: 1 });
userProfileSchema.index({ "contactInfo.email": 1 });
userProfileSchema.index({ "contactInfo.phoneNumber": 1 });
userProfileSchema.index({ "location.coordinates": "2dsphere" });
userProfileSchema.index({ "professionalInfo.skills.name": "text" });
userProfileSchema.index({
  "personalInfo.firstName": "text",
  "personalInfo.lastName": "text",
});
userProfileSchema.index({ isActive: 1 });
userProfileSchema.index({ createdAt: -1 });
userProfileSchema.index({ lastProfileUpdate: -1 });

/**
 * Virtual Properties
 */
userProfileSchema.virtual("fullName").get(function () {
  if (!this.personalInfo) return "";
  const { firstName, lastName, middleName } = this.personalInfo;
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
});

userProfileSchema.virtual("age").get(function () {
  if (!this.personalInfo || !this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

userProfileSchema.virtual("skillNames").get(function () {
  if (!this.professionalInfo || !this.professionalInfo.skills) return [];
  return this.professionalInfo.skills.map((skill) => skill.name);
});

/**
 * Instance Methods
 */
userProfileSchema.methods.calculateProfileCompleteness = function () {
  let score = 0;
  const weights = {
    personalInfo: 25,
    contactInfo: 20,
    location: 15,
    professionalInfo: 30,
    verification: 10,
  };

  // Personal Info completeness
  if (this.personalInfo) {
    const personalFields = ["firstName", "lastName", "dateOfBirth", "gender"];
    const completedPersonal = personalFields.filter(
      (field) => this.personalInfo[field]
    ).length;
    score += (completedPersonal / personalFields.length) * weights.personalInfo;
  }

  // Contact Info completeness
  if (this.contactInfo) {
    const contactFields = ["email", "phoneNumber"];
    const completedContact = contactFields.filter(
      (field) => this.contactInfo[field]
    ).length;
    score += (completedContact / contactFields.length) * weights.contactInfo;
  }

  // Location completeness
  if (this.location && this.location.address) {
    const locationFields = ["city", "state", "country"];
    const completedLocation = locationFields.filter(
      (field) => this.location.address[field]
    ).length;
    score += (completedLocation / locationFields.length) * weights.location;
  }

  // Professional Info completeness
  if (this.professionalInfo) {
    let professionalScore = 0;
    if (this.professionalInfo.currentJobTitle) professionalScore += 25;
    if (this.professionalInfo.industry) professionalScore += 25;
    if (this.professionalInfo.skills && this.professionalInfo.skills.length > 0)
      professionalScore += 25;
    if (this.professionalInfo.experienceLevel) professionalScore += 25;
    score += (professionalScore / 100) * weights.professionalInfo;
  }

  // Verification completeness
  if (this.verification) {
    let verificationScore = 0;
    if (this.verification.isEmailVerified) verificationScore += 40;
    if (this.verification.isPhoneVerified) verificationScore += 30;
    if (this.verification.isIdentityVerified) verificationScore += 30;
    score += (verificationScore / 100) * weights.verification;
  }

  this.profileCompleteness = Math.round(score);
  return this.profileCompleteness;
};

userProfileSchema.methods.addSkill = function (skillData) {
  if (!this.professionalInfo) {
    this.professionalInfo = {};
  }
  if (!this.professionalInfo.skills) {
    this.professionalInfo.skills = [];
  }

  // Check if skill already exists
  const existingSkill = this.professionalInfo.skills.find(
    (skill) => skill.name.toLowerCase() === skillData.name.toLowerCase()
  );

  if (existingSkill) {
    // Update existing skill
    Object.assign(existingSkill, skillData);
  } else {
    // Add new skill
    this.professionalInfo.skills.push(skillData);
  }

  this.lastProfileUpdate = new Date();
  return this;
};

userProfileSchema.methods.removeSkill = function (skillName) {
  if (!this.professionalInfo || !this.professionalInfo.skills) {
    return this;
  }

  this.professionalInfo.skills = this.professionalInfo.skills.filter(
    (skill) => skill.name.toLowerCase() !== skillName.toLowerCase()
  );
  this.lastProfileUpdate = new Date();
  return this;
};

/**
 * Static Methods
 */

userProfileSchema.statics.findNearby = function (
  coordinates,
  maxDistance = 10000
) {
  return this.find({
    "location.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
  });
};

/**
 * Pre-save Middleware
 */
userProfileSchema.pre("save", async function (next) {
  try {
    // Check if email is required based on user role
    if (this.userId) {
      const User = mongoose.model("User");
      const user = await User.findById(this.userId);

      if (user && user.role === "employer") {
        // Email is required for employers
        if (
          !this.contactInfo ||
          !this.contactInfo.email ||
          this.contactInfo.email.trim() === ""
        ) {
          return next(new Error("Email is required for employer accounts"));
        }
      }
    }

    // Update profile completeness
    this.calculateProfileCompleteness();

    // Update last profile update timestamp
    this.lastProfileUpdate = new Date();

    // Validate coordinates if provided
    if (
      this.location &&
      this.location.coordinates &&
      this.location.coordinates.coordinates
    ) {
      const [lng, lat] = this.location.coordinates.coordinates;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return next(new Error("Invalid coordinates provided"));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-findOneAndUpdate Middleware
 */
userProfileSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();

    // If contactInfo.email is being updated, check role requirements
    if (
      update &&
      update.contactInfo &&
      update.contactInfo.hasOwnProperty("email")
    ) {
      const filter = this.getFilter();
      const UserProfile = mongoose.model("UserProfile");
      const userProfile = await UserProfile.findOne(filter).populate("userId");

      if (
        userProfile &&
        userProfile.userId &&
        userProfile.userId.role === "employer"
      ) {
        const newEmail = update.contactInfo.email;
        if (!newEmail || newEmail.trim() === "") {
          return next(new Error("Email is required for employer accounts"));
        }
      }
    }

    this.set({ lastProfileUpdate: new Date() });
    next();
  } catch (error) {
    next(error);
  }
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

export default UserProfile;
