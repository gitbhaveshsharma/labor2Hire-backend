/**
 * @fileoverview Joi validation schemas for user profile management
 * @module validators/userValidator
 * @author Labor2Hire Team
 */

import Joi from "joi";

/**
 * Personal Information Validation Schema
 */
const personalInfoSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters",
    "string.max": "First name cannot exceed 50 characters",
    "any.required": "First name is required",
  }),

  lastName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters",
    "string.max": "Last name cannot exceed 50 characters",
    "any.required": "Last name is required",
  }),

  middleName: Joi.string().trim().max(50).optional().allow("").messages({
    "string.max": "Middle name cannot exceed 50 characters",
  }),

  dateOfBirth: Joi.date()
    .min("1924-01-01")
    .max("now")
    .optional()
    .custom((value, helpers) => {
      const today = new Date();
      const age = today.getFullYear() - value.getFullYear();
      const monthDiff = today.getMonth() - value.getMonth();

      let actualAge = age;
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < value.getDate())
      ) {
        actualAge--;
      }

      if (actualAge < 16) {
        return helpers.message("You must be at least 16 years old");
      }

      if (actualAge > 100) {
        return helpers.message("Age cannot exceed 100 years");
      }

      return value;
    })
    .messages({
      "date.min": "Date of birth cannot be before 1924",
      "date.max": "Date of birth cannot be in the future",
    }),

  gender: Joi.string()
    .valid("male", "female", "other", "prefer-not-to-say")
    .optional()
    .messages({
      "any.only": "Gender must be male, female, other, or prefer-not-to-say",
    }),
  nationality: Joi.string()
    .valid("Indian")
    .default("Indian")
    .optional()
    .messages({
      "any.only": "Only Indian nationality is supported",
    }),

  maritalStatus: Joi.string()
    .valid("single", "married", "divorced", "widowed", "prefer-not-to-say")
    .optional()
    .messages({
      "any.only": "Invalid marital status",
    }),
});

/**
 * Contact Information Validation Schema
 */
const contactInfoSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().optional().allow("").messages({
    "string.email": "Please provide a valid email address",
  }),

  alternateEmail: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .allow("")
    .messages({
      "string.email": "Please provide a valid alternate email address",
    }),

  phoneNumber: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Please provide a valid phone number",
      "any.required": "Phone number is required",
    }),

  alternatePhoneNumber: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Please provide a valid alternate phone number",
    }),

  socialMedia: Joi.object({
    linkedin: Joi.string().uri().optional().allow(""),
    twitter: Joi.string().uri().optional().allow(""),
    facebook: Joi.string().uri().optional().allow(""),
    instagram: Joi.string().uri().optional().allow(""),
  }).optional(),
});

/**
 * Location Validation Schema
 */
const locationSchema = Joi.object({
  address: Joi.object({
    street: Joi.string().trim().max(100).optional().allow(""),
    city: Joi.string().trim().max(50).optional().allow(""),
    state: Joi.string().trim().max(50).optional().allow(""),
    country: Joi.string().trim().max(50).optional().allow(""),
    zipCode: Joi.string().trim().max(20).optional().allow(""),
  }).optional(),

  coordinates: Joi.object({
    type: Joi.string().valid("Point").default("Point"),
    coordinates: Joi.array()
      .items(Joi.number().min(-180).max(180), Joi.number().min(-90).max(90))
      .length(2)
      .optional()
      .messages({
        "array.length":
          "Coordinates must contain exactly 2 values [longitude, latitude]",
        "number.min": "Invalid coordinate values",
        "number.max": "Invalid coordinate values",
      }),
  }).optional(),

  timezone: Joi.string().trim().optional().allow(""),
}).optional();

/**
 * Skill Validation Schema
 */
const skillSchema = Joi.object({
  name: Joi.string().trim().max(50).required().messages({
    "string.empty": "Skill name is required",
    "string.max": "Skill name cannot exceed 50 characters",
    "any.required": "Skill name is required",
  }),

  level: Joi.string()
    .valid("beginner", "intermediate", "advanced", "expert")
    .default("beginner")
    .messages({
      "any.only":
        "Skill level must be beginner, intermediate, advanced, or expert",
    }),

  yearsOfExperience: Joi.number().min(0).max(60).optional().messages({
    "number.min": "Years of experience cannot be negative",
    "number.max": "Years of experience cannot exceed 60",
  }),
});

/**
 * Language Validation Schema
 */
const languageSchema = Joi.object({
  language: Joi.string().trim().max(50).required().messages({
    "string.empty": "Language name is required",
    "string.max": "Language name cannot exceed 50 characters",
    "any.required": "Language name is required",
  }),

  proficiency: Joi.string()
    .valid("basic", "conversational", "fluent", "native")
    .default("basic")
    .messages({
      "any.only":
        "Language proficiency must be basic, conversational, fluent, or native",
    }),
});

/**
 * Professional Information Validation Schema - Simplified for Street Laborers
 */
const professionalInfoSchema = Joi.object({
  workCategory: Joi.string()
    .valid(
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
      "other"
    )
    .optional()
    .messages({
      "any.only": "Invalid work category",
    }),

  skills: Joi.array().items(skillSchema).optional().messages({
    "array.base": "Skills must be an array",
  }),

  languages: Joi.array().items(languageSchema).optional().messages({
    "array.base": "Languages must be an array",
  }),

  availability: Joi.string()
    .valid("daily", "weekly", "part-time", "flexible", "not-available")
    .default("not-available")
    .messages({
      "any.only":
        "Availability must be daily, weekly, part-time, flexible, or not-available",
    }),

  dailyRate: Joi.object({
    amount: Joi.number().min(0).optional(),
    currency: Joi.string().valid("INR").default("INR").optional(),
  }).optional(),
}).optional();

/**
 * Preferences Validation Schema
 */
const preferencesSchema = Joi.object({
  notifications: Joi.object({
    email: Joi.boolean().default(true),
    sms: Joi.boolean().default(false),
    push: Joi.boolean().default(true),
    jobAlerts: Joi.boolean().default(true),
    messageAlerts: Joi.boolean().default(true),
  }).optional(),

  privacy: Joi.object({
    profileVisibility: Joi.string()
      .valid("public", "private", "connections-only")
      .default("public"),
    showEmail: Joi.boolean().default(false),
    showPhone: Joi.boolean().default(false),
    showLocation: Joi.boolean().default(true),
  }).optional(),

  jobPreferences: Joi.object({
    preferredLocations: Joi.array()
      .items(Joi.string().trim().max(100))
      .optional(),
    maxCommuteDitance: Joi.number().min(0).max(500).optional(),
    workType: Joi.string()
      .valid("remote", "on-site", "hybrid", "any")
      .default("any"),
    salaryExpectation: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional(),
      currency: Joi.string().length(3).default("USD").optional(),
    }).optional(),
  }).optional(),
}).optional();

/**
 * Document Validation Schema
 */
const documentSchema = Joi.object({
  type: Joi.string()
    .valid(
      "aadhar-card",
      "pan-card",
      "voter-id",
      "driving-license",
      "ration-card",
      "other"
    )
    .required()
    .messages({
      "any.only":
        "Document type must be aadhar-card, pan-card, voter-id, driving-license, ration-card, or other",
      "any.required": "Document type is required",
    }),

  documentNumber: Joi.string().trim().required().messages({
    "string.empty": "Document number is required",
    "any.required": "Document number is required",
  }),

  issuingState: Joi.string().trim().max(50).required().messages({
    "string.empty": "Issuing state is required",
    "string.max": "Issuing state cannot exceed 50 characters",
    "any.required": "Issuing state is required",
  }),

  issueDate: Joi.date().max("now").optional().messages({
    "date.max": "Issue date cannot be in the future",
  }),
  expiryDate: Joi.date()
    .min("now")
    .min(Joi.ref("issueDate"))
    .optional()
    .messages({
      "date.min": "Document must not be expired",
    }),
});

/**
 * Verification Validation Schema
 */
const verificationSchema = Joi.object({
  documents: Joi.array().items(documentSchema).optional().messages({
    "array.base": "Documents must be an array",
  }),
}).optional();

/**
 * Create User Profile Validation Schema
 */
export const createUserProfileSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  personalInfo: personalInfoSchema.required(),
  contactInfo: contactInfoSchema.required(),
  location: locationSchema,
  professionalInfo: professionalInfoSchema,
  preferences: preferencesSchema,
  verification: verificationSchema,
});

// Alias for compatibility with route imports
export const createUserProfileValidator = createUserProfileSchema;

/**
 * Update User Profile Validation Schema
 */
export const updateUserProfileSchema = Joi.object({
  personalInfo: personalInfoSchema,
  contactInfo: contactInfoSchema,
  location: locationSchema,
  professionalInfo: professionalInfoSchema,
  preferences: preferencesSchema,
  verification: verificationSchema,
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Alias for compatibility with route imports
export const updateUserProfileValidator = updateUserProfileSchema;

/**
 * Search User Profiles Validation Schema
 */
export const searchUserProfilesSchema = Joi.object({
  query: Joi.string().trim().min(1).optional(),
  skills: Joi.alternatives()
    .try(Joi.string().trim(), Joi.array().items(Joi.string().trim()))
    .optional(),
  location: Joi.object({
    coordinates: Joi.array()
      .items(Joi.number().min(-180).max(180), Joi.number().min(-90).max(90))
      .length(2)
      .required(),
    maxDistance: Joi.number().min(1).max(50000).default(10000),
  }).optional(),
  experienceLevel: Joi.string()
    .valid("entry", "junior", "mid", "senior", "expert", "executive")
    .optional(),
  availability: Joi.string()
    .valid("full-time", "part-time", "contract", "freelance", "not-available")
    .optional(),
  isVerified: Joi.boolean().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string()
    .valid(
      "createdAt",
      "lastProfileUpdate",
      "profileCompleteness",
      "profileViews"
    )
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

/**
 * Add Skill Validation Schema
 */
export const addSkillSchema = skillSchema;
export const addSkillValidator = skillSchema;

/**
 * Remove Skill Validation Schema
 */
export const removeSkillSchema = Joi.object({
  skillName: Joi.string().trim().required().messages({
    "string.empty": "Skill name is required",
    "any.required": "Skill name is required",
  }),
});

/**
 * Add Document Validation Schema
 */
export const addDocumentSchema = documentSchema;

/**
 * Add Verification Document Validation Schema
 */
export const addVerificationDocumentValidator = Joi.object({
  type: Joi.string()
    .valid(
      "aadhar-card",
      "pan-card",
      "voter-id",
      "driving-license",
      "ration-card",
      "other"
    )
    .required()
    .messages({
      "any.only":
        "Document type must be aadhar-card, pan-card, voter-id, driving-license, ration-card, or other",
      "any.required": "Document type is required",
    }),

  documentNumber: Joi.string().trim().min(3).max(50).required().messages({
    "string.empty": "Document number is required",
    "string.min": "Document number must be at least 3 characters",
    "string.max": "Document number cannot exceed 50 characters",
    "any.required": "Document number is required",
  }),

  issuingState: Joi.string().trim().max(50).required().messages({
    "string.empty": "Issuing state is required",
    "string.max": "Issuing state cannot exceed 50 characters",
    "any.required": "Issuing state is required",
  }),

  issueDate: Joi.date().max("now").optional().messages({
    "date.max": "Issue date cannot be in the future",
  }),

  expiryDate: Joi.date().min("now").optional().messages({
    "date.min": "Document must not be expired",
  }),

  metadata: Joi.object().optional(),
});

/**
 * Update Verification Status Validation Schema
 */
export const updateVerificationStatusValidator = Joi.object({
  status: Joi.string()
    .valid("pending", "verified", "rejected")
    .required()
    .messages({
      "any.only": "Status must be one of: pending, verified, rejected",
      "any.required": "Status is required",
    }),

  notes: Joi.string().trim().max(500).optional().allow("").messages({
    "string.max": "Notes cannot exceed 500 characters",
  }),

  verifiedBy: Joi.string().trim().optional(),
});

/**
 * Nearby Search Validation Schema
 */
export const nearbySearchValidator = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
    "any.required": "Latitude is required",
  }),

  longitude: Joi.number().min(-180).max(180).required().messages({
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
    "any.required": "Longitude is required",
  }),

  radius: Joi.number().min(0.1).max(100).default(10).messages({
    "number.min": "Radius must be at least 0.1 km",
    "number.max": "Radius cannot exceed 100 km",
  }),

  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),

  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),

  skills: Joi.array().items(Joi.string().trim()).optional(),

  experienceLevel: Joi.string()
    .valid("entry", "intermediate", "senior", "expert")
    .optional(),
});

/**
 * Add Language Validation Schema
 */
export const addLanguageValidator = languageSchema;

/**
 * Update Language Validation Schema
 */
export const updateLanguageValidator = languageSchema;

/**
 * Remove Language Validation Schema
 */
export const removeLanguageValidator = Joi.object({
  language: Joi.string().trim().required().messages({
    "string.empty": "Language is required",
    "any.required": "Language is required",
  }),
});

/**
 * Update Skill Validation Schema
 */
export const updateSkillValidator = skillSchema;

/**
 * Update Preferences Validation Schema
 */
export const updatePreferencesValidator = preferencesSchema;

/**
 * Search Users Validation Schema
 */
export const searchUsersValidator = searchUserProfilesSchema;

/**
 * Decrypt Own Document Validation Schema
 */
export const decryptOwnDocumentValidator = Joi.object({
  password: Joi.string().min(1).required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required to decrypt your document",
  }),
});

/**
 * Update Own Document Validation Schema
 */
export const updateOwnDocumentValidator = Joi.object({
  password: Joi.string().min(1).required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required to update your document",
  }),
  type: Joi.string()
    .valid(
      "aadhar-card",
      "pan-card",
      "voter-id",
      "driving-license",
      "ration-card",
      "other"
    )
    .optional()
    .messages({
      "any.only":
        "Document type must be aadhar-card, pan-card, voter-id, driving-license, ration-card, or other",
    }),
  documentNumber: Joi.string().trim().min(3).max(50).optional().messages({
    "string.min": "Document number must be at least 3 characters",
    "string.max": "Document number cannot exceed 50 characters",
  }),
  issuingState: Joi.string().trim().max(50).optional().messages({
    "string.max": "Issuing state cannot exceed 50 characters",
  }),
  issueDate: Joi.date().max("now").optional().messages({
    "date.max": "Issue date cannot be in the future",
  }),
  expiryDate: Joi.date().min("now").optional().messages({
    "date.min": "Document must not be expired",
  }),
  metadata: Joi.object().optional(),
})
  .min(2)
  .messages({
    "object.min": "At least password and one field to update are required",
  });

/**
 * Delete Own Document Validation Schema
 */
export const deleteOwnDocumentValidator = Joi.object({
  password: Joi.string().min(1).required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required to delete your document",
  }),
});

/**
 * Role-based Contact Information Validation Schema
 * Creates a dynamic schema based on user role
 */
const createRoleBasedContactInfoSchema = (userRole) => {
  const baseSchema = {
    alternateEmail: Joi.string()
      .email()
      .lowercase()
      .trim()
      .optional()
      .allow("")
      .messages({
        "string.email": "Please provide a valid alternate email address",
      }),

    phoneNumber: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Please provide a valid phone number",
        "any.required": "Phone number is required",
      }),

    alternatePhoneNumber: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
      .optional()
      .allow("")
      .messages({
        "string.pattern.base": "Please provide a valid alternate phone number",
      }),

    socialMedia: Joi.object({
      linkedin: Joi.string().uri().optional().allow(""),
      twitter: Joi.string().uri().optional().allow(""),
      facebook: Joi.string().uri().optional().allow(""),
      instagram: Joi.string().uri().optional().allow(""),
    }).optional(),
  };

  // Email is required for employers, optional for others
  if (userRole === "employer") {
    baseSchema.email = Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        "string.email": "Please provide a valid email address",
        "string.empty": "Email is required for employer accounts",
        "any.required": "Email is required for employer accounts",
      });
  } else {
    baseSchema.email = Joi.string()
      .email()
      .lowercase()
      .trim()
      .optional()
      .allow("")
      .messages({
        "string.email": "Please provide a valid email address",
      });
  }

  return Joi.object(baseSchema);
};

/**
 * Create role-based user profile validation schema
 */
export const createRoleBasedUserProfileSchema = (userRole) => {
  return Joi.object({
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid user ID format",
        "any.required": "User ID is required",
      }),
    personalInfo: personalInfoSchema.required(),
    contactInfo: createRoleBasedContactInfoSchema(userRole).required(),
    location: locationSchema,
    professionalInfo: professionalInfoSchema,
    preferences: preferencesSchema,
    verification: verificationSchema,
  });
};

/**
 * Update role-based user profile validation schema
 */
export const updateRoleBasedUserProfileSchema = (userRole) => {
  return Joi.object({
    personalInfo: personalInfoSchema,
    contactInfo: createRoleBasedContactInfoSchema(userRole),
    location: locationSchema,
    professionalInfo: professionalInfoSchema,
    preferences: preferencesSchema,
    verification: verificationSchema,
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    });
};
