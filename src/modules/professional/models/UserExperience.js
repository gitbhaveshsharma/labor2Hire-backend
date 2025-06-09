import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * User Experience Schema
 * Professional experience data moved from UserProfile
 */
const userExperienceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        validate: {
          validator: function (value) {
            return !value || value > this.duration.startDate;
          },
          message: "End date must be after start date",
        },
      },
      isCurrent: {
        type: Boolean,
        default: false,
      },
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    skills: [String],
    achievements: [String],
    responsibilities: [String],
    location: {
      city: String,
      state: String,
      country: String,
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance", "internship"],
      default: "full-time",
    },
    industry: String,
    salary: {
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
userExperienceSchema.index({ userId: 1, "duration.startDate": -1 });
userExperienceSchema.index({ skills: 1 });
userExperienceSchema.index({ industry: 1 });

// Virtual for calculating experience duration
userExperienceSchema.virtual("durationInMonths").get(function () {
  const startDate = new Date(this.duration.startDate);
  const endDate = this.duration.endDate
    ? new Date(this.duration.endDate)
    : new Date();

  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();

  return years * 12 + months;
});

// Virtual for formatted duration
userExperienceSchema.virtual("formattedDuration").get(function () {
  const totalMonths = this.durationInMonths;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) {
    return `${years} year${years > 1 ? "s" : ""} ${months} month${months > 1 ? "s" : ""}`;
  } else if (years > 0) {
    return `${years} year${years > 1 ? "s" : ""}`;
  } else {
    return `${months} month${months > 1 ? "s" : ""}`;
  }
});

export default model("UserExperience", userExperienceSchema);
