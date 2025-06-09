import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * User Portfolio Schema
 * Portfolio data moved from UserProfile for better organization
 */
const userPortfolioSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String,
        caption: String,
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    videos: [
      {
        url: String,
        publicId: String,
        thumbnail: String,
        duration: Number, // in seconds
        caption: String,
      },
    ],
    completedDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Completion date cannot be in the future",
      },
    },
    client: {
      name: String,
      company: String,
      testimonial: String,
      isPublic: {
        type: Boolean,
        default: false,
      },
    },
    skills: [String],
    tags: [String],
    category: {
      type: String,
      enum: [
        "construction",
        "electrical",
        "plumbing",
        "carpentry",
        "painting",
        "landscaping",
        "cleaning",
        "maintenance",
        "other",
      ],
    },
    projectDuration: {
      startDate: Date,
      endDate: Date,
      totalHours: Number,
    },
    budget: {
      amount: Number,
      currency: {
        type: String,
        default: "INR",
      },
      isPublic: {
        type: Boolean,
        default: false,
      },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
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
userPortfolioSchema.index({ userId: 1, completedDate: -1 });
userPortfolioSchema.index({ skills: 1 });
userPortfolioSchema.index({ category: 1 });
userPortfolioSchema.index({ isPublic: 1, isFeatured: -1 });
userPortfolioSchema.index({ tags: 1 });

// Virtual for project duration in days
userPortfolioSchema.virtual("durationInDays").get(function () {
  if (!this.projectDuration.startDate || !this.projectDuration.endDate) {
    return null;
  }

  const timeDiff =
    this.projectDuration.endDate - this.projectDuration.startDate;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
});

// Method to increment views
userPortfolioSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Method to increment likes
userPortfolioSchema.methods.incrementLikes = function () {
  this.likes += 1;
  return this.save();
};

// Method to get public portfolio data
userPortfolioSchema.methods.getPublicData = function () {
  if (!this.isPublic) {
    return null;
  }

  const publicData = this.toObject();

  // Remove sensitive information
  if (publicData.client && !publicData.client.isPublic) {
    delete publicData.client;
  }

  if (publicData.budget && !publicData.budget.isPublic) {
    delete publicData.budget;
  }

  return publicData;
};

export default model("UserPortfolio", userPortfolioSchema);
