/**
 * @fileoverview Location model for geolocation tracking
 * @module models/Location
 * @author Labor2Hire Team
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Location Schema for storing user location data
 * Note: Primary location data is stored in Redis for real-time operations
 * This model is for historical data and backup purposes
 */
const locationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, "Coordinates are required"],
      validate: {
        validator: function (coords) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            typeof coords[0] === "number" &&
            typeof coords[1] === "number" &&
            coords[0] >= -180 &&
            coords[0] <= 180 && // longitude
            coords[1] >= -90 &&
            coords[1] <= 90
          ); // latitude
        },
        message: "Coordinates must be [longitude, latitude] with valid ranges",
      },
    },

    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "offline",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    accuracy: {
      type: Number,
      min: [0, "Accuracy cannot be negative"],
      default: null,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for geospatial queries
locationSchema.index({ coordinates: "2dsphere" });
locationSchema.index({ userId: 1, isActive: 1 });
locationSchema.index({ status: 1, isActive: 1 });
locationSchema.index({ lastSeen: -1 });

// Static method to find nearby active users
locationSchema.statics.findNearby = function (
  longitude,
  latitude,
  maxDistance = 10000
) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
    status: { $in: ["available", "busy"] },
  });
};

// Instance method to update location
locationSchema.methods.updateCoordinates = function (
  longitude,
  latitude,
  status = "available"
) {
  this.coordinates = [longitude, latitude];
  this.status = status;
  this.lastSeen = new Date();
  return this.save();
};

const Location = mongoose.model("Location", locationSchema);

export default Location;
