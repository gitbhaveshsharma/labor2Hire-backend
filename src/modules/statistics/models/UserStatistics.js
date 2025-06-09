import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * User Statistics Schema
 * Moved from UserProfile to separate service for better data organization
 */
const userStatisticsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    jobsInProgress: {
      type: Number,
      default: 0,
    },
    totalJobsApplied: {
      type: Number,
      default: 0,
    },
    totalJobsPosted: {
      type: Number,
      default: 0,
    },
    averageJobDuration: {
      type: Number,
      default: 0, // in hours
    },
    clientRetentionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastActivityDate: {
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
userStatisticsSchema.index({ totalEarnings: -1 });
userStatisticsSchema.index({ completedJobs: -1 });
userStatisticsSchema.index({ lastActivityDate: -1 });

// Virtual for calculating performance score
userStatisticsSchema.virtual("performanceScore").get(function () {
  const weights = {
    completedJobs: 0.3,
    successRate: 0.25,
    clientRetentionRate: 0.25,
    averageRating: 0.2,
  };

  const normalizedJobs = Math.min(this.completedJobs / 100, 1); // Normalize to 0-1
  const normalizedSuccessRate = this.successRate / 100;
  const normalizedRetentionRate = this.clientRetentionRate / 100;
  const normalizedRating = (this.averageRating || 0) / 5;

  const score =
    (normalizedJobs * weights.completedJobs +
      normalizedSuccessRate * weights.successRate +
      normalizedRetentionRate * weights.clientRetentionRate +
      normalizedRating * weights.averageRating) *
    100;

  return Math.round(score);
});

// Methods for updating statistics
userStatisticsSchema.methods.incrementCompletedJobs = function () {
  this.completedJobs += 1;
  this.lastActivityDate = new Date();
  return this.save();
};

userStatisticsSchema.methods.addEarnings = function (amount) {
  this.totalEarnings += amount;
  this.lastActivityDate = new Date();
  return this.save();
};

userStatisticsSchema.methods.updateSuccessRate = function () {
  if (this.totalJobsApplied > 0) {
    this.successRate = Math.round(
      (this.completedJobs / this.totalJobsApplied) * 100
    );
  }
  return this.save();
};

export default model("UserStatistics", userStatisticsSchema);
