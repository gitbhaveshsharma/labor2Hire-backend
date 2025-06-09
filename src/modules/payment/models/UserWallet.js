import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * User Wallet Schema
 * Wallet balance and transaction data moved from UserProfile for security
 */
const userWalletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    balance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
      validate: {
        validator(balance) {
          return Number.isInteger(balance * 100);
        },
        message: "Wallet balance must have at most 2 decimal places",
      },
    },

    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP"],
    },

    // Wallet status
    status: {
      type: String,
      enum: ["active", "frozen", "suspended"],
      default: "active",
    },

    // Security PIN hash for wallet operations
    pinHash: String,

    // Last transaction details
    lastTransaction: {
      amount: Number,
      type: {
        type: String,
        enum: ["credit", "debit"],
      },
      description: String,
      timestamp: Date,
    },

    // Account limits
    limits: {
      dailyLimit: {
        type: Number,
        default: 10000,
      },
      monthlyLimit: {
        type: Number,
        default: 50000,
      },
      singleTransactionLimit: {
        type: Number,
        default: 5000,
      },
    },

    // Verification status for wallet
    isVerified: {
      type: Boolean,
      default: false,
    },

    // KYC status
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "not-required"],
      default: "not-required",
    },

    // Linked bank accounts or payment methods
    linkedAccounts: [
      {
        type: {
          type: String,
          enum: ["bank", "upi", "card"],
        },
        accountId: String, // Encrypted account details
        isDefault: {
          type: Boolean,
          default: false,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.pinHash; // Never expose PIN hash
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
userWalletSchema.index({ status: 1 });
userWalletSchema.index({ isVerified: 1 });
userWalletSchema.index({ kycStatus: 1 });

// Virtual for formatted balance
userWalletSchema.virtual("formattedBalance").get(function () {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: this.currency || "INR",
  }).format(this.balance);
});

// Methods for wallet operations
userWalletSchema.methods.credit = function (amount, description = "Credit") {
  if (amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  this.balance += amount;
  this.lastTransaction = {
    amount,
    type: "credit",
    description,
    timestamp: new Date(),
  };

  return this.save();
};

userWalletSchema.methods.debit = function (amount, description = "Debit") {
  if (amount <= 0) {
    throw new Error("Debit amount must be positive");
  }

  if (this.balance < amount) {
    throw new Error("Insufficient balance");
  }

  this.balance -= amount;
  this.lastTransaction = {
    amount,
    type: "debit",
    description,
    timestamp: new Date(),
  };

  return this.save();
};

userWalletSchema.methods.canWithdraw = function (amount) {
  return (
    this.status === "active" &&
    this.balance >= amount &&
    amount <= this.limits.singleTransactionLimit
  );
};

userWalletSchema.methods.freeze = function () {
  this.status = "frozen";
  return this.save();
};

userWalletSchema.methods.unfreeze = function () {
  this.status = "active";
  return this.save();
};

// Static method to get wallet summary for user
userWalletSchema.statics.getWalletSummary = function (userId) {
  return this.findOne({ userId })
    .select("balance currency status isVerified lastTransaction")
    .lean();
};

export default model("UserWallet", userWalletSchema);
