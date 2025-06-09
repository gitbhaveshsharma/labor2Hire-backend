/**
 * @fileoverview User management service with comprehensive business logic
 * @module services/userService
 * @author Labor2Hire Team
 */

import UserProfile from "../models/UserProfile.js";
import User from "../../authentication/models/User.js";
import {
  encrypt,
  decrypt,
  encryptDocument,
  decryptDocument,
  safeDecrypt,
} from "../utils/encryption.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * User Service Class
 * Handles all business logic for user profile management
 */
class UserService {
  /**
   * Create a new user profile
   * @param {Object} profileData - User profile data
   * @returns {Promise<Object>} Created user profile
   */
  async createUserProfile(profileData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user exists
      const user = await User.findById(profileData.userId).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if profile already exists
      const existingProfile = await UserProfile.findOne({
        userId: profileData.userId,
      }).session(session);

      if (existingProfile) {
        throw new Error("User profile already exists");
      }

      // Check for email uniqueness
      if (profileData.contactInfo?.email) {
        const emailExists = await UserProfile.findOne({
          "contactInfo.email": profileData.contactInfo.email,
        }).session(session);

        if (emailExists) {
          throw new Error("Email address is already in use");
        }
      }

      // Create the profile
      const profile = new UserProfile(profileData);
      await profile.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        data: profile,
        message: "User profile created successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get user profile by ID
   * @param {string} profileId - Profile ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User profile
   */
  async getUserProfileById(profileId, options = {}) {
    try {
      const { includeEncrypted = false, incrementViews = false } = options;

      let query = UserProfile.findById(profileId);

      if (options.populate) {
        query = query.populate("userId", "phoneNumber role isActive");
      }

      const profile = await query.exec();

      if (!profile) {
        throw new Error("User profile not found");
      }

      // Increment profile views if requested
      if (incrementViews) {
        await UserProfile.findByIdAndUpdate(
          profileId,
          { $inc: { profileViews: 1 } },
          { new: false }
        );
      }

      // Handle encrypted document decryption for authorized access
      if (includeEncrypted && profile.verification?.documents) {
        profile.verification.documents = profile.verification.documents.map(
          (doc) => {
            try {
              const decryptResult = safeDecrypt(doc.documentNumber);
              return {
                ...doc.toObject(),
                documentNumber: decryptResult.success
                  ? decryptResult.data
                  : "***DECRYPTION_FAILED***",
              };
            } catch (error) {
              console.error("Failed to decrypt document:", error);
              return {
                ...doc.toObject(),
                documentNumber: "***DECRYPTION_FAILED***",
              };
            }
          }
        );
      }

      return {
        success: true,
        data: profile,
        message: "User profile retrieved successfully",
      };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get user profile by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User profile
   */
  async getUserProfileByUserId(userId, options = {}) {
    try {
      let query = UserProfile.findOne({ userId });

      if (options.populate) {
        query = query.populate("userId", "phoneNumber role isActive");
      }

      const profile = await query.exec();

      if (!profile) {
        throw new Error("User profile not found");
      } // Transform the profile to include document IDs while keeping encrypted document numbers
      const profileData = profile.toObject();

      // Debug logging
      console.log("🔍 DEBUG - Profile documents check:");
      console.log("Profile found:", !!profile);
      console.log("Raw profile verification:", profile.verification);
      console.log(
        "Raw profile documents length:",
        profile.verification?.documents?.length || 0
      );
      console.log("toObject verification:", profileData.verification);
      console.log(
        "toObject documents length:",
        profileData.verification?.documents?.length || 0
      );

      // Make sure document IDs are visible for the user to reference them
      if (profileData.verification?.documents) {
        console.log("🔍 Processing documents...");
        profileData.verification.documents =
          profileData.verification.documents.map((doc, index) => {
            console.log(`Document ${index}:`, doc);
            console.log(`Document _id:`, doc._id);
            return {
              ...doc,
              documentId: doc._id, // Make sure the document ID is explicitly available
              documentNumber: "***ENCRYPTED***", // Keep document numbers encrypted in regular profile view
            };
          });
        console.log("🔍 Final documents:", profileData.verification.documents);
      } else {
        console.log("🔍 No documents found in profileData");
      }

      return {
        success: true,
        data: profileData,
        message: "User profile retrieved successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} profileId - Profile ID
   * @param {Object} updateData - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(profileId, updateData, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { validateUniqueness = true } = options;

      // Get existing profile
      const existingProfile =
        await UserProfile.findById(profileId).session(session);
      if (!existingProfile) {
        throw new Error("User profile not found");
      }

      // Validate email uniqueness if email is being updated
      if (validateUniqueness && updateData.contactInfo?.email) {
        const emailExists = await UserProfile.findOne({
          "contactInfo.email": updateData.contactInfo.email,
          _id: { $ne: profileId },
        }).session(session);

        if (emailExists) {
          throw new Error("Email address is already in use");
        }
      }

      // Merge the update data
      const mergedData = this._mergeProfileData(
        existingProfile.toObject(),
        updateData
      );

      // Update the profile
      const updatedProfile = await UserProfile.findByIdAndUpdate(
        profileId,
        mergedData,
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      await session.commitTransaction();

      return {
        success: true,
        data: updatedProfile,
        message: "User profile updated successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete user profile
   * @param {string} profileId - Profile ID
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserProfile(profileId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { softDelete = true } = options;

      const profile = await UserProfile.findById(profileId).session(session);
      if (!profile) {
        throw new Error("User profile not found");
      }

      let result;
      if (softDelete) {
        // Soft delete - just mark as inactive
        result = await UserProfile.findByIdAndUpdate(
          profileId,
          {
            isActive: false,
            lastProfileUpdate: new Date(),
          },
          { new: true, session }
        );
      } else {
        // Hard delete
        result =
          await UserProfile.findByIdAndDelete(profileId).session(session);
      }

      await session.commitTransaction();

      return {
        success: true,
        data: result,
        message: `User profile ${softDelete ? "deactivated" : "deleted"} successfully`,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Search user profiles with advanced filtering
   * @param {Object} searchCriteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchUserProfiles(searchCriteria, options = {}) {
    try {
      const {
        query,
        skills,
        location,
        experienceLevel,
        availability,
        isVerified,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = searchCriteria;

      const { includeInactive = false, includeStats = false } = options;

      // Build the search query
      const searchQuery = { isActive: true };

      if (!includeInactive) {
        searchQuery.isActive = true;
      }

      // Text search on name and skills
      if (query) {
        const textRegex = new RegExp(query, "i");
        searchQuery.$or = [
          { "personalInfo.firstName": textRegex },
          { "personalInfo.lastName": textRegex },
          { "professionalInfo.skills.name": textRegex },
          { "professionalInfo.currentJobTitle": textRegex },
        ];
      }

      // Skills filter
      if (skills) {
        const skillArray = Array.isArray(skills) ? skills : [skills];
        searchQuery["professionalInfo.skills.name"] = {
          $in: skillArray.map((skill) => new RegExp(skill, "i")),
        };
      }

      // Experience level filter
      if (experienceLevel) {
        searchQuery["professionalInfo.experienceLevel"] = experienceLevel;
      }

      // Availability filter
      if (availability) {
        searchQuery["professionalInfo.availability"] = availability;
      }

      // Verification filter
      if (isVerified !== undefined) {
        if (isVerified) {
          searchQuery["verification.isEmailVerified"] = true;
          searchQuery["verification.isPhoneVerified"] = true;
        }
      }

      // Location-based search
      let locationQuery = {};
      if (location && location.coordinates) {
        const { coordinates, maxDistance = 10000 } = location;
        locationQuery = {
          "location.coordinates": {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: coordinates,
              },
              $maxDistance: maxDistance,
            },
          },
        };
      }

      // Combine queries
      const finalQuery = location?.coordinates
        ? { ...searchQuery, ...locationQuery }
        : searchQuery;

      // Build sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute the search
      const skip = (page - 1) * limit;

      const [profiles, totalCount] = await Promise.all([
        UserProfile.find(finalQuery)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate("userId", "phoneNumber role isActive")
          .lean(),
        UserProfile.countDocuments(finalQuery),
      ]);

      // Get search statistics if requested
      let stats = null;
      if (includeStats) {
        stats = await this._getSearchStats(finalQuery);
      }

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: {
          profiles,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit,
          },
          stats,
        },
        message: "User profiles retrieved successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find nearby user profiles using geospatial queries
   * @param {Array} coordinates - [longitude, latitude]
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Nearby profiles
   */
  async findNearbyProfiles(coordinates, options = {}) {
    try {
      const {
        maxDistance = 10000, // 10km default
        page = 1,
        limit = 10,
        filters = {},
      } = options;

      const searchQuery = {
        isActive: true,
        "location.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: coordinates,
            },
            $maxDistance: maxDistance,
          },
        },
        ...filters,
      };

      const skip = (page - 1) * limit;

      const [profiles, totalCount] = await Promise.all([
        UserProfile.find(searchQuery)
          .skip(skip)
          .limit(limit)
          .populate("userId", "phoneNumber role")
          .lean(),
        UserProfile.countDocuments(searchQuery),
      ]);

      // Calculate distances for each profile
      const profilesWithDistance = profiles.map((profile) => {
        if (profile.location?.coordinates?.coordinates) {
          const distance = this._calculateDistance(
            coordinates,
            profile.location.coordinates.coordinates
          );
          return { ...profile, distance };
        }
        return profile;
      });

      return {
        success: true,
        data: {
          profiles: profilesWithDistance,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
            limit,
          },
          searchCenter: coordinates,
          maxDistance,
        },
        message: "Nearby profiles retrieved successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Manage user skills
   * @param {string} profileId - Profile ID
   * @param {Object} skillData - Skill data
   * @param {string} operation - Operation type (add/remove/update)
   * @returns {Promise<Object>} Operation result
   */
  async manageSkill(profileId, skillData, operation) {
    try {
      const profile = await UserProfile.findById(profileId);
      if (!profile) {
        throw new Error("User profile not found");
      }

      switch (operation) {
        case "add":
          profile.addSkill(skillData);
          break;
        case "remove":
          profile.removeSkill(skillData.name);
          break;
        case "update":
          profile.removeSkill(skillData.name);
          profile.addSkill(skillData);
          break;
        default:
          throw new Error("Invalid operation");
      }

      await profile.save();

      return {
        success: true,
        data: profile,
        message: `Skill ${operation}ed successfully`,
      };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Add verification document
   * @param {string} profileId - Profile ID
   * @param {Object} documentData - Document data
   * @returns {Promise<Object>} Updated profile
   */
  async addVerificationDocument(profileId, documentData) {
    try {
      const profile = await UserProfile.findById(profileId);
      if (!profile) {
        throw new Error("User profile not found");
      }

      // Check if document type already exists
      const existingDoc = profile.verification?.documents?.find(
        (doc) => doc.type === documentData.type
      );

      if (existingDoc) {
        throw new Error(`Document of type ${documentData.type} already exists`);
      }

      // Initialize verification if not exists
      if (!profile.verification) {
        profile.verification = { documents: [] };
      }
      if (!profile.verification.documents) {
        profile.verification.documents = [];
      }

      // Add the document (encryption handled by model)
      profile.verification.documents.push(documentData);
      await profile.save();

      return {
        success: true,
        data: profile,
        message: "Verification document added successfully",
      };
    } catch (error) {
      throw error;
    }
  } /**
   * Get decrypted document (admin only)
   * @param {string} profileId - Profile ID or User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Decrypted document
   */
  async getDecryptedDocument(profileId, documentId) {
    try {
      let profile = null;

      // Try different approaches to find the profile
      // 1. First check if profileId is a valid ObjectId and try as profile ID
      if (mongoose.Types.ObjectId.isValid(profileId)) {
        profile = await UserProfile.findById(profileId);
      }

      // 2. If not found, try as user ID in UserProfile's userId field
      if (!profile) {
        profile = await UserProfile.findOne({ userId: profileId });
      }

      // 3. If still not found, try to find User by ID and then get profile
      if (!profile) {
        const user = await User.findById(profileId);
        if (user) {
          profile = await UserProfile.findOne({ userId: user._id });
        }
      }

      if (!profile) {
        throw new Error("User profile not found");
      }

      const document = profile.verification?.documents?.id(documentId);
      if (!document) {
        throw new Error("Document not found");
      } // Decrypt the document number
      let decryptedNumber;
      try {
        // Get the raw encrypted value to avoid getter interference
        const documentObj = document.toObject();
        const decryptResult = safeDecrypt(documentObj.documentNumber);

        if (!decryptResult.success) {
          console.error("Document decryption failed:", {
            error: decryptResult.error,
            analysis: decryptResult.analysis,
            suggestion: decryptResult.suggestion,
            documentId,
          });

          throw new Error(
            `Failed to decrypt document: ${decryptResult.error}. ${decryptResult.suggestion}`
          );
        }

        decryptedNumber = decryptResult.data;
      } catch (decryptionError) {
        console.error("Document decryption error:", decryptionError);
        throw new Error(
          `Failed to decrypt document: ${decryptionError.message}. This document may be corrupted or encrypted with a different key.`
        );
      }

      return {
        success: true,
        data: {
          ...document.toObject(),
          documentNumber: decryptedNumber,
          decryptedAt: new Date().toISOString(),
          accessedBy: "admin",
        },
        message: "Document decrypted successfully",
      };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get decrypted document from own profile with password verification
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @param {string} password - User's password for verification
   * @returns {Promise<Object>} Decrypted document
   */ async getOwnDecryptedDocument(userId, documentId, password) {
    try {
      // Verify user's password first
      const user = await User.findById(userId).select("+hashedPassword");
      if (!user) {
        throw new Error("User not found");
      }

      // Compare provided password with stored hash
      const isPasswordValid = await bcrypt.compare(
        password,
        user.hashedPassword
      );
      if (!isPasswordValid) {
        throw new Error(
          "Invalid password. Please verify your identity to access this document."
        );
      } // Find user profile by userId
      const profile = await UserProfile.findOne({ userId });

      if (!profile) {
        throw new Error("User profile not found");
      }

      const document = profile.verification?.documents?.id(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Decrypt the document number
      let decryptedNumber;
      try {
        // Get the raw encrypted value to avoid getter interference
        const documentObj = document.toObject();

        // Use safe decrypt for better error diagnostics
        const decryptionResult = safeDecrypt(documentObj.documentNumber);

        if (!decryptionResult.success) {
          console.error("Document decryption failed:", {
            error: decryptionResult.error,
            analysis: decryptionResult.analysis,
            suggestion: decryptionResult.suggestion,
            documentId,
          });

          throw new Error(
            `Failed to decrypt document: ${decryptionResult.error}. ${decryptionResult.suggestion}`
          );
        }

        decryptedNumber = decryptionResult.data;
      } catch (decryptionError) {
        console.error("Document decryption error:", decryptionError);
        throw new Error(
          `Failed to decrypt document: ${decryptionError.message}. This document may be corrupted or encrypted with a different key.`
        );
      }

      return {
        success: true,
        data: {
          ...document.toObject(),
          documentNumber: decryptedNumber,
          decryptedAt: new Date().toISOString(),
          accessedBy: userId,
        },
        message: "Document decrypted successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update verification status
   * @param {string} profileId - Profile ID
   * @param {string} documentId - Document ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated profile
   */
  async updateVerificationStatus(profileId, documentId, status) {
    try {
      const profile = await UserProfile.findById(profileId);
      if (!profile) {
        throw new Error("User profile not found");
      }

      const document = profile.verification?.documents?.id(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      document.verificationStatus = status;
      if (status === "verified") {
        document.verifiedAt = new Date();

        // Update overall verification flags
        this._updateVerificationFlags(profile);
      }

      await profile.save();

      return {
        success: true,
        data: profile,
        message: "Verification status updated successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics(profileId) {
    try {
      const profile = await UserProfile.findById(profileId);
      if (!profile) {
        throw new Error("User profile not found");
      }
      const stats = {
        profileCompleteness: profile.profileCompleteness,
        profileViews: profile.profileViews,
        skillsCount: profile.professionalInfo?.skills?.length || 0,
        languagesCount: profile.professionalInfo?.languages?.length || 0,
        verificationLevel: profile.verification?.verificationLevel || "none",
        isEmailVerified: profile.verification?.isEmailVerified || false,
        isPhoneVerified: profile.verification?.isPhoneVerified || false,
        isIdentityVerified: profile.verification?.isIdentityVerified || false,
        lastActive: profile.lastProfileUpdate,
        memberSince: profile.createdAt,
      };

      return {
        success: true,
        data: stats,
        message: "User statistics retrieved successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update own verification document
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @param {Object} updateData - Update data
   * @param {string} password - User's password for verification
   * @returns {Promise<Object>} Updated document
   */
  async updateOwnDocument(userId, documentId, updateData, password) {
    try {
      // Verify user's password first
      const user = await User.findById(userId).select("+hashedPassword");
      if (!user) {
        throw new Error("User not found");
      }

      // Compare provided password with stored hash
      const isPasswordValid = await bcrypt.compare(
        password,
        user.hashedPassword
      );
      if (!isPasswordValid) {
        throw new Error(
          "Invalid password. Please verify your identity to update this document."
        );
      }

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        throw new Error("User profile not found");
      }

      const document = profile.verification?.documents?.id(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Check if document type is being changed and if it already exists
      if (updateData.type && updateData.type !== document.type) {
        const existingDoc = profile.verification.documents.find(
          (doc) =>
            doc.type === updateData.type && doc._id.toString() !== documentId
        );
        if (existingDoc) {
          throw new Error(`Document of type ${updateData.type} already exists`);
        }
      }

      // Update document fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          document[key] = updateData[key];
        }
      });

      // Reset verification status if critical fields are changed
      if (updateData.documentNumber || updateData.type) {
        document.verificationStatus = "pending";
        document.verifiedAt = null;
        document.verifiedBy = null;
      }

      await profile.save();

      return {
        success: true,
        data: document,
        message: "Document updated successfully",
      };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Delete own verification document
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @param {string} password - User's password for verification
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOwnDocument(userId, documentId, password) {
    try {
      // Verify user's password first
      const user = await User.findById(userId).select("+hashedPassword");
      if (!user) {
        throw new Error("User not found");
      }

      // Compare provided password with stored hash
      const isPasswordValid = await bcrypt.compare(
        password,
        user.hashedPassword
      );
      if (!isPasswordValid) {
        throw new Error(
          "Invalid password. Please verify your identity to delete this document."
        );
      }

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        throw new Error("User profile not found");
      }

      const document = profile.verification?.documents?.id(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Remove the document
      profile.verification.documents.pull(documentId);

      // Update verification flags
      this._updateVerificationFlags(profile);

      await profile.save();

      return {
        success: true,
        data: {
          deletedDocumentId: documentId,
          documentType: document.type,
        },
        message: "Document deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper method to merge profile data
   * @private
   */
  _mergeProfileData(existing, updates) {
    const merged = { ...existing };

    Object.keys(updates).forEach((key) => {
      if (
        typeof updates[key] === "object" &&
        !Array.isArray(updates[key]) &&
        updates[key] !== null
      ) {
        merged[key] = { ...merged[key], ...updates[key] };
      } else {
        merged[key] = updates[key];
      }
    });

    return merged;
  }

  /**
   * Helper method to calculate distance between coordinates
   * @private
   */
  _calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1[1] * Math.PI) / 180;
    const φ2 = (coord2[1] * Math.PI) / 180;
    const Δφ = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const Δλ = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  }

  /**
   * Helper method to get search statistics
   * @private
   */
  async _getSearchStats(query) {
    try {
      const stats = await UserProfile.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalProfiles: { $sum: 1 },
            avgProfileCompleteness: { $avg: "$profileCompleteness" },
            verifiedProfiles: {
              $sum: {
                $cond: ["$verification.isEmailVerified", 1, 0],
              },
            },
            experienceLevels: {
              $push: "$professionalInfo.experienceLevel",
            },
            topSkills: {
              $push: "$professionalInfo.skills.name",
            },
          },
        },
        {
          $project: {
            totalProfiles: 1,
            avgProfileCompleteness: { $round: ["$avgProfileCompleteness", 1] },
            verifiedProfiles: 1,
            verificationRate: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$verifiedProfiles", "$totalProfiles"] },
                    100,
                  ],
                },
                1,
              ],
            },
          },
        },
      ]);

      return stats[0] || null;
    } catch (error) {
      console.error("Error getting search stats:", error);
      return null;
    }
  }

  /**
   * Helper method to update verification flags
   * @private
   */
  _updateVerificationFlags(profile) {
    if (!profile.verification) return;

    const documents = profile.verification.documents || [];
    const verifiedDocs = documents.filter(
      (doc) => doc.verificationStatus === "verified"
    );

    // Update verification level based on verified documents
    if (verifiedDocs.length === 0) {
      profile.verification.verificationLevel = "none";
    } else if (verifiedDocs.length === 1) {
      profile.verification.verificationLevel = "basic";
    } else if (verifiedDocs.length === 2) {
      profile.verification.verificationLevel = "standard";
    } else {
      profile.verification.verificationLevel = "premium";
    }

    // Update identity verification flag
    const hasIdentityDoc = verifiedDocs.some((doc) =>
      ["passport", "drivers-license", "national-id"].includes(doc.type)
    );
    profile.verification.isIdentityVerified = hasIdentityDoc;
  }
}

// Make sure it's exported as default if imported as default
export default UserService;

// Or if using named exports, make sure the controller imports it correctly:
// export { UserService };
