/**
 * @fileoverview Negotiation model for storing negotiation history and messages
 * @module models/Negotiation
 * @author Labor2Hire Team
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Negotiation Message Schema
 * Stores individual messages in a negotiation conversation
 */
const negotiationMessageSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
      index: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
      index: true,
    },

    searchId: {
      type: String,
      required: [true, "Search ID is required"],
      index: true,
    },
    notificationId: {
      type: String,
      required: [true, "Notification ID is required"],
      unique: true,
    },

    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },

    senderType: {
      type: String,
      enum: ["employer", "laborer"],
      required: [true, "Sender type is required"],
      index: true,
    },

    senderName: {
      type: String,
      required: [true, "Sender name is required"],
      trim: true,
    },

    wage: {
      type: Number,
      required: [true, "Wage is required"],
      min: [0, "Wage cannot be negative"],
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "counter", "expired"],
      default: "pending",
      index: true,
    },

    negotiationStatus: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
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

/**
 * Negotiation Conversation Schema
 * Groups messages between two parties for a specific job
 */
const negotiationConversationSchema = new Schema(
  {
    participantIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    searchId: {
      type: String,
      required: [true, "Search ID is required"],
      index: true,
    },

    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employer ID is required"],
      index: true,
    },

    laborerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Laborer ID is required"],
      index: true,
    },

    jobDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Job description cannot exceed 500 characters"],
    },

    initialWage: {
      type: Number,
      required: [true, "Initial wage is required"],
      min: [0, "Wage cannot be negative"],
    },

    finalWage: {
      type: Number,
      default: null,
      min: [0, "Wage cannot be negative"],
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    messageCount: {
      type: Number,
      default: 0,
      min: 0,
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

// Indexes for efficient queries
negotiationMessageSchema.index({ senderId: 1, receiverId: 1 });
negotiationMessageSchema.index({ searchId: 1, createdAt: -1 });
negotiationMessageSchema.index({ createdAt: -1 });
negotiationMessageSchema.index({ isRead: 1, receiverId: 1 });

negotiationConversationSchema.index({ participantIds: 1 });
negotiationConversationSchema.index({ searchId: 1, status: 1 });
negotiationConversationSchema.index({ employerId: 1, laborerId: 1 });
negotiationConversationSchema.index({ lastMessageAt: -1 });
negotiationConversationSchema.index({ status: 1, lastMessageAt: -1 });

// Static methods for NegotiationMessage
negotiationMessageSchema.statics.findConversation = function (
  senderId,
  receiverId,
  searchId
) {
  return this.find({
    $or: [
      { senderId, receiverId, searchId },
      { senderId: receiverId, receiverId: senderId, searchId },
    ],
  }).sort({ createdAt: 1 });
};

negotiationMessageSchema.statics.markAsRead = function (messageIds, userId) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      receiverId: userId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

// Static methods for NegotiationConversation
negotiationConversationSchema.statics.findByParticipants = function (
  userId1,
  userId2,
  searchId
) {
  return this.findOne({
    participantIds: { $all: [userId1, userId2] },
    searchId,
  });
};

negotiationConversationSchema.statics.findActiveConversations = function (
  userId
) {
  return this.find({
    participantIds: userId,
    status: "active",
  }).sort({ lastMessageAt: -1 });
};

// Instance methods
negotiationConversationSchema.methods.updateLastMessage = function () {
  this.lastMessageAt = new Date();
  this.messageCount += 1;
  return this.save();
};

negotiationConversationSchema.methods.markCompleted = function (
  finalWage = null
) {
  this.status = "completed";
  this.completedAt = new Date();
  if (finalWage !== null) {
    this.finalWage = finalWage;
  }
  return this.save();
};

const NegotiationMessage = mongoose.model(
  "NegotiationMessage",
  negotiationMessageSchema
);
const NegotiationConversation = mongoose.model(
  "NegotiationConversation",
  negotiationConversationSchema
);

export { NegotiationMessage, NegotiationConversation };
