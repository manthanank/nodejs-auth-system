const mongoose = require("mongoose");
const { hashPassword, comparePassword } = require("../utils/password.util");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    refreshToken: String,
    mre: { type: String, default: "" }, // Most Recent Email
    activeSession: {
      deviceId: String,
      lastActive: Date
    }
  },
  { timestamps: true }
);

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = function (password) {
  return comparePassword(password, this.password);
};

userSchema.methods.generateResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  return resetToken;
};

userSchema.methods.generateVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString("hex");
  this.verificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  return verificationToken;
};

userSchema.methods.verifyToken = function (token) {
  return this.verificationToken ===
    crypto.createHash("sha256").update(token).digest("hex") &&
    this.verificationTokenExpires > Date.now();
};

userSchema.methods.generateRefreshToken = function () {
  const refreshToken = crypto.randomBytes(20).toString("hex");
  this.refreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  return refreshToken;
};

userSchema.statics.getResetPasswordHash = function (token) {
  return crypto.createHash("sha256").update(token).digest("hex");
};

userSchema.methods.incLoginAttempts = function (cb) {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne(
      {
        $set: { loginAttempts: 1 },
        $unset: { lockUntil: 1 },
      },
      cb
    );
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  return this.updateOne(updates, cb);
};

module.exports = mongoose.model("User", userSchema);