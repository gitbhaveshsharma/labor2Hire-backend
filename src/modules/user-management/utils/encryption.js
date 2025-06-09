/**
 * @fileoverview Encryption utilities for secure data handling
 * @module utils/encryption
 * @author Labor2Hire Team
 */

import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const SECRET_KEY =
  process.env.ENCRYPTION_SECRET_KEY ||
  "default-secret-key-change-in-production";
const RSA_KEY_SIZE = 2048;

/**
 * Generate a cryptographically secure key from the secret
 * @param {string} secret - The secret key
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} - Derived key
 */
function deriveKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha512");
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text with IV, salt, and tag
 */
export function encrypt(text) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text to encrypt must be a non-empty string");
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH); // Derive key from secret and salt
    const key = deriveKey(SECRET_KEY, salt);

    // Create cipher using the proper GCM method
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from("additional-data"));

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const result =
      salt.toString("hex") +
      ":" +
      iv.toString("hex") +
      ":" +
      tag.toString("hex") +
      ":" +
      encrypted;

    return result;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data with IV, salt, and tag
 * @returns {string} - Decrypted text
 */
export function decrypt(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== "string") {
      throw new Error("Encrypted data must be a non-empty string");
    }

    // Split the encrypted data
    const parts = encryptedData.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }

    const salt = Buffer.from(parts[0], "hex");
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const encrypted = parts[3]; // Derive key from secret and salt
    const key = deriveKey(SECRET_KEY, salt);

    // Create decipher using the proper GCM method
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from("additional-data"));

    // Decrypt the data
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);

    // Try legacy decryption for backwards compatibility
    try {
      console.log("Attempting legacy decryption...");
      const legacyResult = legacyDecrypt(encryptedData);
      console.log("Legacy decryption successful");
      return legacyResult;
    } catch (legacyError) {
      console.error("Legacy decryption also failed:", legacyError.message);
    }

    throw new Error("Failed to decrypt data");
  }
}

/**
 * Generate RSA key pair for asymmetric encryption
 * @returns {Object} - Public and private key pair
 */
export function generateRSAKeyPair() {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: RSA_KEY_SIZE,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    return { publicKey, privateKey };
  } catch (error) {
    console.error("RSA key generation error:", error);
    throw new Error("Failed to generate RSA key pair");
  }
}

/**
 * Encrypt data using RSA public key
 * @param {string} text - Text to encrypt
 * @param {string} publicKey - RSA public key in PEM format
 * @returns {string} - Encrypted text in base64
 */
export function encryptRSA(text, publicKey) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text to encrypt must be a non-empty string");
    }

    if (!publicKey || typeof publicKey !== "string") {
      throw new Error("Public key must be a non-empty string");
    }

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(text, "utf8")
    );

    return encrypted.toString("base64");
  } catch (error) {
    console.error("RSA encryption error:", error);
    throw new Error("Failed to encrypt data with RSA");
  }
}

/**
 * Decrypt data using RSA private key
 * @param {string} encryptedData - Encrypted data in base64
 * @param {string} privateKey - RSA private key in PEM format
 * @returns {string} - Decrypted text
 */
export function decryptRSA(encryptedData, privateKey) {
  try {
    if (!encryptedData || typeof encryptedData !== "string") {
      throw new Error("Encrypted data must be a non-empty string");
    }

    if (!privateKey || typeof privateKey !== "string") {
      throw new Error("Private key must be a non-empty string");
    }

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedData, "base64")
    );

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("RSA decryption error:", error);
    throw new Error("Failed to decrypt data with RSA");
  }
}

/**
 * Hash data using SHA-256
 * @param {string} text - Text to hash
 * @returns {string} - Hashed text in hex
 */
export function hash(text) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text to hash must be a non-empty string");
    }

    return crypto.createHash("sha256").update(text).digest("hex");
  } catch (error) {
    console.error("Hashing error:", error);
    throw new Error("Failed to hash data");
  }
}

/**
 * Hash data with salt using SHA-256
 * @param {string} text - Text to hash
 * @param {string} salt - Salt for hashing
 * @returns {string} - Hashed text in hex
 */
export function hashWithSalt(text, salt) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text to hash must be a non-empty string");
    }

    if (!salt || typeof salt !== "string") {
      throw new Error("Salt must be a non-empty string");
    }

    return crypto
      .createHash("sha256")
      .update(text + salt)
      .digest("hex");
  } catch (error) {
    console.error("Salted hashing error:", error);
    throw new Error("Failed to hash data with salt");
  }
}

/**
 * Generate a random salt
 * @param {number} length - Length of the salt in bytes
 * @returns {string} - Random salt in hex
 */
export function generateSalt(length = 32) {
  try {
    return crypto.randomBytes(length).toString("hex");
  } catch (error) {
    console.error("Salt generation error:", error);
    throw new Error("Failed to generate salt");
  }
}

/**
 * Generate a random token
 * @param {number} length - Length of the token in bytes
 * @returns {string} - Random token in hex
 */
export function generateToken(length = 32) {
  try {
    return crypto.randomBytes(length).toString("hex");
  } catch (error) {
    console.error("Token generation error:", error);
    throw new Error("Failed to generate token");
  }
}

/**
 * Compare a plain text with its hash
 * @param {string} text - Plain text
 * @param {string} hash - Hash to compare against
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} - True if they match
 */
export function compareHash(text, hash, salt) {
  try {
    const hashedText = hashWithSalt(text, salt);
    return crypto.timingSafeEqual(Buffer.from(hashedText), Buffer.from(hash));
  } catch (error) {
    console.error("Hash comparison error:", error);
    return false;
  }
}

/**
 * Encrypt document data with additional metadata
 * @param {Object} documentData - Document data to encrypt
 * @returns {string} - Encrypted document data
 */
export function encryptDocument(documentData) {
  try {
    if (!documentData || typeof documentData !== "object") {
      throw new Error("Document data must be an object");
    }

    const documentString = JSON.stringify({
      ...documentData,
      timestamp: new Date().toISOString(),
      checksum: hash(JSON.stringify(documentData)),
    });

    return encrypt(documentString);
  } catch (error) {
    console.error("Document encryption error:", error);
    throw new Error("Failed to encrypt document");
  }
}

/**
 * Decrypt document data and verify integrity
 * @param {string} encryptedDocument - Encrypted document data
 * @returns {Object} - Decrypted document data
 */
export function decryptDocument(encryptedDocument) {
  try {
    const decryptedString = decrypt(encryptedDocument);
    const documentData = JSON.parse(decryptedString);

    // Verify checksum
    const { checksum, timestamp, ...originalData } = documentData;
    const calculatedChecksum = hash(JSON.stringify(originalData));

    if (checksum !== calculatedChecksum) {
      throw new Error("Document integrity check failed");
    }

    return {
      ...originalData,
      decryptedAt: new Date().toISOString(),
      originalTimestamp: timestamp,
    };
  } catch (error) {
    console.error("Document decryption error:", error);
    throw new Error("Failed to decrypt document");
  }
}

/**
 * Validate encryption configuration
 * @returns {boolean} - True if configuration is valid
 */
export function validateEncryptionConfig() {
  try {
    // Check if secret key is properly configured
    if (
      !SECRET_KEY ||
      SECRET_KEY === "default-secret-key-change-in-production"
    ) {
      console.warn(
        "Warning: Using default encryption key. Please set ENCRYPTION_SECRET_KEY in environment variables."
      );
      return false;
    }

    if (SECRET_KEY.length < 32) {
      console.warn(
        "Warning: Encryption key should be at least 32 characters long."
      );
      return false;
    }

    // Test encryption/decryption
    const testData = "test-encryption-data";
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (testData !== decrypted) {
      console.error("Encryption/decryption test failed");
      return false;
    }

    console.log("Encryption configuration validated successfully");
    return true;
  } catch (error) {
    console.error("Encryption configuration validation error:", error);
    return false;
  }
}

/**
 * Diagnostic function to analyze encrypted data format
 * @param {string} encryptedData - Encrypted data to analyze
 * @returns {Object} - Analysis results
 */
export function analyzeEncryptedData(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== "string") {
      return {
        isValid: false,
        error: "Data is not a string or is empty",
        data: encryptedData,
      };
    }

    const parts = encryptedData.split(":");

    return {
      isValid: parts.length === 4,
      partsCount: parts.length,
      parts: parts.map((part, index) => ({
        index,
        length: part.length,
        isValidHex: /^[0-9a-fA-F]*$/.test(part),
        preview: part.substring(0, 20) + (part.length > 20 ? "..." : ""),
      })),
      expectedFormat: "salt:iv:tag:encrypted (all in hex)",
      analysis: {
        saltLength: parts[0] ? parts[0].length : 0,
        ivLength: parts[1] ? parts[1].length : 0,
        tagLength: parts[2] ? parts[2].length : 0,
        encryptedLength: parts[3] ? parts[3].length : 0,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      data: encryptedData,
    };
  }
}

/**
 * Safe decrypt function that provides detailed error information
 * @param {string} encryptedData - Encrypted data with IV, salt, and tag
 * @returns {Object} - Result object with success status and data
 */
export function safeDecrypt(encryptedData) {
  try {
    // First analyze the data format
    const analysis = analyzeEncryptedData(encryptedData);

    if (!analysis.isValid) {
      return {
        success: false,
        error: "Invalid data format",
        analysis,
        suggestion:
          "Data appears to be corrupted or not encrypted with current format",
      };
    }

    // Proceed with normal decryption
    const decrypted = decrypt(encryptedData);
    return {
      success: true,
      data: decrypted,
      analysis,
    };
  } catch (error) {
    const analysis = analyzeEncryptedData(encryptedData);

    return {
      success: false,
      error: error.message,
      analysis,
      suggestion: analysis.isValid
        ? "Data format is correct but decryption failed - possibly wrong key or corrupted data"
        : "Data format is invalid - data may be corrupted",
    };
  }
}

/**
 * Legacy decrypt function for data encrypted with old parameters
 * @param {string} encryptedData - Legacy encrypted data
 * @returns {string} - Decrypted text
 */
function legacyDecrypt(encryptedData) {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }

    const salt = Buffer.from(parts[0], "hex");
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const encrypted = parts[3];

    // Check if this looks like legacy format (different salt length)
    if (salt.length !== SALT_LENGTH) {
      console.log(
        `Legacy format detected: salt length ${salt.length} vs expected ${SALT_LENGTH}`
      );
    }

    // Derive key from secret and salt (same as current)
    const key = deriveKey(SECRET_KEY, salt);

    // Create decipher using the proper GCM method
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    // Try without AAD first (legacy might not have used AAD)
    // decipher.setAAD(Buffer.from("additional-data"));

    // Decrypt the data
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw error;
  }
}

// Initialize and validate configuration on module load
validateEncryptionConfig();
