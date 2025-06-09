/**
 * Security Testing Suite
 * Comprehensive tests to validate token security and ownership verification
 *
 * @author Labor2Hire Team
 * @description Tests authentication, authorization, and security violation detection
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import { expect } from "chai";
import app from "../app.js";
import User from "../modules/authentication/models/User.js";
import UserProfile from "../modules/user-management/models/UserProfile.js";
import { tokenSessionManager } from "../middlewares/tokenSecurity.js";

describe("Token Security and Ownership Validation", () => {
  let testUsers = {};
  let testProfiles = {};
  let validTokens = {};

  before(async () => {
    // Create test users
    const userData1 = {
      name: "Test User 1",
      phoneNumber: "9876543210",
      hashedPassword: "hashedpassword123",
      role: "laborer",
      accountStatus: "active",
      isActive: true,
    };

    const userData2 = {
      name: "Test User 2",
      phoneNumber: "9876543211",
      hashedPassword: "hashedpassword456",
      role: "laborer",
      accountStatus: "active",
      isActive: true,
    };

    const adminData = {
      name: "Admin User",
      phoneNumber: "9876543212",
      hashedPassword: "adminpassword789",
      role: "admin",
      accountStatus: "active",
      isActive: true,
    };

    testUsers.user1 = await User.create(userData1);
    testUsers.user2 = await User.create(userData2);
    testUsers.admin = await User.create(adminData);

    // Create user profiles
    const profileData1 = {
      userId: testUsers.user1._id,
      personalInfo: {
        firstName: "Test",
        lastName: "User1",
      },
      contactInfo: {
        phoneNumber: "9876543210",
      },
    };

    const profileData2 = {
      userId: testUsers.user2._id,
      personalInfo: {
        firstName: "Test",
        lastName: "User2",
      },
      contactInfo: {
        phoneNumber: "9876543211",
      },
    };

    testProfiles.user1 = await UserProfile.create(profileData1);
    testProfiles.user2 = await UserProfile.create(profileData2);

    // Generate valid tokens
    validTokens.user1 = jwt.sign(
      {
        id: testUsers.user1._id.toString(),
        role: "laborer",
        accountStatus: "active",
        jti: "user1-token-123",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    validTokens.user2 = jwt.sign(
      {
        id: testUsers.user2._id.toString(),
        role: "laborer",
        accountStatus: "active",
        jti: "user2-token-456",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    validTokens.admin = jwt.sign(
      {
        id: testUsers.admin._id.toString(),
        role: "admin",
        accountStatus: "active",
        jti: "admin-token-789",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Register token sessions
    tokenSessionManager.registerSession(
      testUsers.user1._id.toString(),
      "user1-token-123",
      "fingerprint1"
    );
    tokenSessionManager.registerSession(
      testUsers.user2._id.toString(),
      "user2-token-456",
      "fingerprint2"
    );
    tokenSessionManager.registerSession(
      testUsers.admin._id.toString(),
      "admin-token-789",
      "fingerprint3"
    );
  });

  after(async () => {
    // Cleanup test data
    await User.deleteMany({
      phoneNumber: { $in: ["9876543210", "9876543211", "9876543212"] },
    });
    await UserProfile.deleteMany({
      userId: { $in: [testUsers.user1?._id, testUsers.user2?._id] },
    });
  });

  describe("Token Validation Security", () => {
    it("should reject requests with no token", async () => {
      const response = await request(app)
        .get("/api/user-profiles/me")
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("token");
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/user-profiles/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("Invalid token");
    });

    it("should reject expired tokens", async () => {
      const expiredToken = jwt.sign(
        {
          id: testUsers.user1._id.toString(),
          role: "laborer",
          accountStatus: "active",
        },
        process.env.JWT_SECRET,
        { expiresIn: "-1h" } // Expired 1 hour ago
      );

      const response = await request(app)
        .get("/api/user-profiles/me")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("expired");
    });

    it("should reject tokens for inactive users", async () => {
      // Temporarily deactivate user
      await User.findByIdAndUpdate(testUsers.user1._id, {
        accountStatus: "suspended",
      });

      const response = await request(app)
        .get("/api/user-profiles/me")
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("inactive");

      // Reactivate user for other tests
      await User.findByIdAndUpdate(testUsers.user1._id, {
        accountStatus: "active",
      });
    });

    it("should reject blacklisted tokens", async () => {
      // Blacklist the token
      tokenSessionManager.invalidateSession(
        testUsers.user1._id.toString(),
        "user1-token-123"
      );

      const response = await request(app)
        .get("/api/user-profiles/me")
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("revoked");

      // Re-register session for other tests
      tokenSessionManager.registerSession(
        testUsers.user1._id.toString(),
        "user1-token-123",
        "fingerprint1"
      );
    });
  });

  describe("Profile Ownership Validation", () => {
    it("should allow users to access their own profile", async () => {
      const response = await request(app)
        .get(`/api/user-profiles/${testProfiles.user1._id}`)
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.userId).to.equal(
        testUsers.user1._id.toString()
      );
    });

    it("should prevent users from accessing other users' profiles", async () => {
      const response = await request(app)
        .get(`/api/user-profiles/${testProfiles.user2._id}`)
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("own profile");
    });

    it("should allow admins to access any profile", async () => {
      const response = await request(app)
        .get(`/api/user-profiles/${testProfiles.user1._id}`)
        .set("Authorization", `Bearer ${validTokens.admin}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it("should prevent profile modification by non-owners", async () => {
      const updateData = {
        personalInfo: {
          firstName: "Hacked",
          lastName: "User",
        },
      };

      const response = await request(app)
        .put(`/api/user-profiles/${testProfiles.user2._id}`)
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("own");
    });

    it("should reject access to non-existent profiles", async () => {
      const fakeProfileId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .get(`/api/user-profiles/${fakeProfileId}`)
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("not found");
    });
  });

  describe("Document Access Security", () => {
    let documentId;

    before(async () => {
      // Add a test document to user1's profile
      const documentData = {
        type: "aadhar-card",
        documentNumber: "123456789012",
        issuingState: "TestState",
      };

      const response = await request(app)
        .post("/api/user-profiles/documents")
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .send(documentData)
        .expect(201);

      documentId = response.body.data._id;
    });

    it("should require password for own document decryption", async () => {
      const response = await request(app)
        .post(`/api/user-profiles/documents/${documentId}/decrypt`)
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .send({}) // No password
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("Password is required");
    });

    it("should prevent other users from accessing documents", async () => {
      const response = await request(app)
        .post(`/api/user-profiles/documents/${documentId}/decrypt`)
        .set("Authorization", `Bearer ${validTokens.user2}`)
        .send({ password: "anypassword" })
        .expect(403);

      expect(response.body.success).to.be.false;
    });

    it("should prevent document modification without password", async () => {
      const updateData = {
        documentNumber: "999999999999",
        // Missing required password
      };

      const response = await request(app)
        .put(`/api/user-profiles/documents/${documentId}`)
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("Password is required");
    });
  });

  describe("Session Management", () => {
    it("should track active sessions", () => {
      const sessionCount = tokenSessionManager.getActiveSessionCount(
        testUsers.user1._id.toString()
      );
      expect(sessionCount).to.be.at.least(1);
    });

    it("should invalidate user sessions", () => {
      tokenSessionManager.invalidateAllUserSessions(
        testUsers.user1._id.toString()
      );

      const sessionCount = tokenSessionManager.getActiveSessionCount(
        testUsers.user1._id.toString()
      );
      expect(sessionCount).to.equal(0);
    });

    it("should reject requests after session invalidation", async () => {
      const response = await request(app)
        .get("/api/user-profiles/me")
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("Session expired");
    });
  });

  describe("Security Violation Detection", () => {
    it("should detect and log unauthorized access attempts", async () => {
      // Try to access another user's profile
      const response = await request(app)
        .get(`/api/user-profiles/${testProfiles.user1._id}`)
        .set("Authorization", `Bearer ${validTokens.user2}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include("own profile");
    });

    it("should handle malformed profile IDs gracefully", async () => {
      const response = await request(app)
        .get("/api/user-profiles/invalid-id")
        .set("Authorization", `Bearer ${validTokens.user2}`)
        .expect(400);

      expect(response.body.success).to.be.false;
    });
  });

  describe("Role-Based Access Control", () => {
    it("should enforce laborer role restrictions", async () => {
      // Laborers shouldn't be able to access admin endpoints
      const response = await request(app)
        .get("/api/admin/users") // Hypothetical admin endpoint
        .set("Authorization", `Bearer ${validTokens.user1}`)
        .expect(403);

      expect(response.body.success).to.be.false;
    });

    it("should allow admin global access", async () => {
      // Admins should be able to access any user's profile
      const response = await request(app)
        .get(`/api/user-profiles/${testProfiles.user1._id}`)
        .set("Authorization", `Bearer ${validTokens.admin}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });
  });
});

/**
 * Manual Security Test Scenarios
 * These tests should be run manually to verify security measures
 */
export const manualSecurityTests = {
  /**
   * Test 1: Token Replay Attack Simulation
   */
  tokenReplayAttack: async () => {
    console.log("\\n🔒 Testing Token Replay Attack Prevention...");

    // Simulate an attacker capturing and replaying a token
    const capturedToken = validTokens.user1;

    // First request should work
    let response = await request(app)
      .get("/api/user-profiles/me")
      .set("Authorization", `Bearer ${capturedToken}`);

    console.log("First request (legitimate):", response.status);

    // Invalidate the session (simulating logout)
    const decoded = jwt.decode(capturedToken);
    tokenSessionManager.invalidateSession(decoded.id, decoded.jti);

    // Replay attack should fail
    response = await request(app)
      .get("/api/user-profiles/me")
      .set("Authorization", `Bearer ${capturedToken}`);

    console.log(
      "Replay attack result:",
      response.status,
      response.body.message
    );
    console.log(response.status === 401 ? "✅ PASSED" : "❌ FAILED");
  },

  /**
   * Test 2: Profile ID Manipulation
   */
  profileIdManipulation: async () => {
    console.log("\\n🔒 Testing Profile ID Manipulation...");

    // Try to access profile by manipulating URL parameters
    const response = await request(app)
      .get(`/api/user-profiles/${testProfiles.user2._id}`)
      .set("Authorization", `Bearer ${validTokens.user1}`);

    console.log(
      "Profile manipulation result:",
      response.status,
      response.body.message
    );
    console.log(response.status === 403 ? "✅ PASSED" : "❌ FAILED");
  },

  /**
   * Test 3: JWT Token Tampering
   */
  jwtTokenTampering: async () => {
    console.log("\\n🔒 Testing JWT Token Tampering...");

    const originalToken = validTokens.user1;
    const [header, payload, signature] = originalToken.split(".");

    // Tamper with payload (change user ID)
    const tamperedPayload = Buffer.from(payload, "base64url");
    const payloadObj = JSON.parse(tamperedPayload.toString());
    payloadObj.id = testUsers.user2._id.toString(); // Change to different user

    const newPayload = Buffer.from(JSON.stringify(payloadObj)).toString(
      "base64url"
    );
    const tamperedToken = `${header}.${newPayload}.${signature}`;

    const response = await request(app)
      .get("/api/user-profiles/me")
      .set("Authorization", `Bearer ${tamperedToken}`);

    console.log(
      "Token tampering result:",
      response.status,
      response.body.message
    );
    console.log(response.status === 401 ? "✅ PASSED" : "❌ FAILED");
  },

  /**
   * Run all manual tests
   */
  runAll: async () => {
    console.log("\\n🛡️  RUNNING MANUAL SECURITY TESTS");
    console.log("=====================================");

    await manualSecurityTests.tokenReplayAttack();
    await manualSecurityTests.profileIdManipulation();
    await manualSecurityTests.jwtTokenTampering();

    console.log("\\n🛡️  MANUAL SECURITY TESTS COMPLETED");
  },
};

export default {
  manualSecurityTests,
};
