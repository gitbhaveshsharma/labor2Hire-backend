import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Company Profile Schema
 * Detailed company information moved from UserProfile
 */
const companyProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },

    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
    },

    industry: {
      type: String,
      required: true,
      enum: [
        "construction",
        "manufacturing",
        "retail",
        "hospitality",
        "healthcare",
        "education",
        "technology",
        "agriculture",
        "logistics",
        "real-estate",
        "automotive",
        "other",
      ],
    },

    website: {
      type: String,
      validate: {
        validator: function (url) {
          if (!url) return true;
          return /^https?:\/\/.+/.test(url);
        },
        message: "Please enter a valid website URL",
      },
    },

    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    companyLogo: {
      url: String,
      publicId: String,
      uploadedAt: Date,
    },

    // Address information
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: "India",
      },
    },

    // Contact information
    contactInfo: {
      email: {
        type: String,
        validate: {
          validator: function (email) {
            if (!email) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          },
          message: "Please enter a valid email address",
        },
      },
      phone: String,
      alternatePhone: String,
    },

    // Verification and legal information
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    businessLicense: {
      number: String,
      issuedBy: String,
      expiryDate: Date,
      documentUrl: String,
      isVerified: {
        type: Boolean,
        default: false,
      },
    },

    taxInformation: {
      gstNumber: String,
      panNumber: String,
      taxId: String,
    },

    // Company statistics
    statistics: {
      totalJobsPosted: {
        type: Number,
        default: 0,
      },
      activeJobs: {
        type: Number,
        default: 0,
      },
      completedProjects: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      responseTime: {
        type: Number,
        default: 0, // in hours
      },
    },

    // Company preferences
    preferences: {
      preferredSkills: [String],
      preferredRadius: {
        type: Number,
        default: 25,
        min: 1,
        max: 100,
      },
      budgetRange: {
        min: Number,
        max: Number,
        currency: {
          type: String,
          default: "INR",
        },
      },
    },

    // Social media and online presence
    socialMedia: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
    },

    // Operational information
    operatingHours: {
      monday: { start: String, end: String, isClosed: Boolean },
      tuesday: { start: String, end: String, isClosed: Boolean },
      wednesday: { start: String, end: String, isClosed: Boolean },
      thursday: { start: String, end: String, isClosed: Boolean },
      friday: { start: String, end: String, isClosed: Boolean },
      saturday: { start: String, end: String, isClosed: Boolean },
      sunday: { start: String, end: String, isClosed: Boolean },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
companyProfileSchema.index({ industry: 1 });
companyProfileSchema.index({ verificationStatus: 1 });
companyProfileSchema.index({ "address.city": 1, "address.state": 1 });
companyProfileSchema.index({ "statistics.averageRating": -1 });
companyProfileSchema.index({ isActive: 1 });

// Virtual for full address
companyProfileSchema.virtual("fullAddress").get(function () {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

// Virtual for company profile completeness
companyProfileSchema.virtual("profileCompleteness").get(function () {
  const requiredFields = [
    "companyName",
    "industry",
    "description",
    "address.street",
    "address.city",
    "address.state",
    "address.zipCode",
    "contactInfo.email",
    "contactInfo.phone",
  ];

  const optionalFields = [
    "website",
    "companyLogo.url",
    "businessLicense.number",
    "companySize",
  ];

  let completed = 0;
  const totalFields = requiredFields.length + optionalFields.length;

  requiredFields.forEach((field) => {
    if (this.get(field)) completed++;
  });

  optionalFields.forEach((field) => {
    if (this.get(field)) completed++;
  });

  return Math.round((completed / totalFields) * 100);
});

// Method to get public company profile
companyProfileSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    userId: this.userId,
    companyName: this.companyName,
    industry: this.industry,
    description: this.description,
    companyLogo: this.companyLogo,
    address: {
      city: this.address.city,
      state: this.address.state,
      country: this.address.country,
    },
    website: this.website,
    verificationStatus: this.verificationStatus,
    statistics: this.statistics,
    socialMedia: this.socialMedia,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

// Method to verify business license
companyProfileSchema.methods.verifyBusinessLicense = function () {
  this.businessLicense.isVerified = true;
  this.verificationStatus = "verified";
  this.lastUpdated = new Date();
  return this.save();
};

// Pre-save middleware
companyProfileSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

export default model("CompanyProfile", companyProfileSchema);
