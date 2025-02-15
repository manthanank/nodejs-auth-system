const User = require("../models/User");
const { generateToken } = require("../utils/jwt.util");
const { log, error } = require("../utils/logger");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
} = require("../validations/auth.validation");
const { sendEmail } = require("../utils/email");
const { detectDevice } = require("../utils/device.util");
const { v4: uuidv4 } = require('uuid');

const login = async (req, res) => {
  try {
    const { error: validationError } = loginSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ message: validationError.details[0].message });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      log(`Login attempt failed: Invalid credentials for ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isLocked) {
      log(`Login attempt failed: Account locked for ${email}`);
      return res.status(403).json({ message: "Account locked" });
    }

    if (!user.isVerified) {
      log(`Login attempt failed: Email not verified for ${email}`);
      return res
        .status(400)
        .json({ message: "Email not verified. Check your inbox." });
    }

    const deviceId = req.headers['device-id'] || uuidv4();

    // Check for existing active session
    if (user.activeSession && user.activeSession.deviceId !== deviceId) {
      return res.status(401).json({ 
        message: 'Another session is active. Please logout from other devices first.'
      });
    }

    // Check for maximum device limit
    if (user.activeSessions && user.activeSessions.length >= 4) {
      return res.status(401).json({ 
        message: 'Maximum device limit reached. Please logout from another device.',
        currentSessions: user.activeSessions.map(session => ({
          deviceId: session.deviceId,
          userAgent: session.userAgent,
          lastActive: session.lastActive
        }))
      });
    }

    // Update active session
    user.activeSession = {
      deviceId: deviceId,
      lastActive: new Date()
    };

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken; // Store the new refresh token
    await user.save();

    const token = generateToken({ id: user._id }, "1h");

    // Detect device
    const deviceInfo = detectDevice(req);
    const deviceMessage = `Login detected from a new device: ${deviceInfo}`;

    // Send email notification
    await sendEmail(user.email, "New Device Login Detected", deviceMessage);

    log(`User logged in successfully: ${email}`);
    return res.status(200).json({ 
      token, 
      refreshToken, 
      role: user.role, 
      expiresIn: 3600,
      deviceId // Send device ID to client
    });
  } catch (err) {
    error(`Error logging in: ${err.message}`);
    return res.status(500).json({ message: "Error logging in" });
  }
};

const register = async (req, res) => {
  try {
    const { error: validationError } = registerSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ message: validationError.details[0].message });
    }

    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      log(`Registration attempt failed: Email ${email} already exists`);
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = new User({ email, password, mre: email });
    const verificationToken = user.generateVerificationToken();
    await user.save();

    const verificationUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;

    await sendEmail(
      user.email,
      "Email Verification",
      `Please click on the link to verify your email: ${verificationUrl}`
    );

    log(`User registered successfully: ${email}`);
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    error(`Error registering user: ${err.message}`);
    return res.status(500).json({ message: "Error registering user" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = User.getResetPasswordHash(token);

    const user = await User.findOne({
      verificationToken: hashedToken,
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    log(`Email verified successfully: ${user.email}`);
    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    error(`Error verifying email: ${err.message}`);
    return res.status(500).json({ message: "Error verifying email" });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const hashedToken = User.getResetPasswordHash(refreshToken);

    const user = await User.findOne({ refreshToken: hashedToken });
    if (!user) {
      return res.status(400).json({ message: "Invalid refresh token" });
    }

    const newAuthToken = generateToken({ id: user._id }, "1h");
    const newRefreshToken = user.generateRefreshToken();
    user.refreshToken = newRefreshToken; // Store the new refresh token
    await user.save();

    return res
      .status(200)
      .json({ token: newAuthToken, refreshToken: newRefreshToken });
  } catch (err) {
    error(`Error refreshing token: ${err.message}`);
    return res.status(500).json({ message: "Error refreshing token" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    log("Profile fetched successfully");
    const userProfile = user.toObject();
    return res.status(200).json(userProfile);
  } catch (err) {
    error(`Error fetching profile: ${err.message}`);
    return res.status(500).json({ message: "Error fetching profile" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { error: validationError } = forgotPasswordSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ message: validationError.details[0].message });
    }
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      log(`Forgot password attempt failed: User not found for ${email}`);
      return res.status(400).json({ message: "User not found" });
    }

    const resetToken = user.generateResetToken();
    await user.save();

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n${resetUrl}`;

    await sendEmail(user.email, "Password reset request", message);

    log(`Password reset email sent to: ${email}`);
    return res.status(200).json({ message: "Email sent" });
  } catch (err) {
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }

    error(`Error sending password reset email: ${err.message}`);
    return res.status(500).json({ message: "Email could not be sent" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { error: validationError } = resetPasswordSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ message: validationError.details[0].message });
    }
    const { token } = req.params;
    const { password } = req.body;

    const resetPasswordToken = User.getResetPasswordHash(token);
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      log(`Reset password attempt failed: Invalid or expired token`);
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    log(`Password reset successful for: ${user.email}`);
    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    error(`Error resetting password: ${err.message}`);
    return res.status(500).json({ message: "Error resetting password" });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const verificationToken = user.generateVerificationToken();
    await user.save();

    const verificationUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/verify-email/${verificationToken}`;

    await sendEmail(
      user.email,
      "Email Verification",
      `Please click on the link to verify your email: ${verificationUrl}`
    );

    log(`Verification email resent to: ${user.email}`);
    return res.status(200).json({ message: "Verification email resent" });
  } catch (err) {
    error(`Error resending verification email: ${err.message}`);
    return res.status(500).json({ message: "Error resending verification email" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { error: validationError } = resetPasswordSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError.details[0].message });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.password = req.body.password;
    await user.save();

    log(`Password changed successfully for: ${user.email}`);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    error(`Error changing password: ${err.message}`);
    return res.status(500).json({ message: "Error changing password" });
  }
};

const updateProfile = async (req, res) => {
  const { error: validationError } = profileSchema.validate(req.body);
  if (validationError) {
    return res
      .status(400)
      .json({ message: validationError.details[0].message });
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, {
      new: true,
    }).select("-password");
    user.mre = req.body.email;
    await user.save();
    log(`Profile updated successfully: ${user.email}`);
    const userProfile = user.toObject();
    return res.status(200).json(userProfile);
  } catch (err) {
    error(`Error updating profile: ${err.message}`);
    return res.status(500).json({ message: "Error updating profile" });
  }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const deviceId = req.deviceId;

    // Remove the specific session
    user.activeSessions = user.activeSessions.filter(
      session => session.deviceId !== deviceId
    );
    
    await user.save();
    log(`User logged out from device ${deviceId}: ${user.email}`);

    return res.status(200).json({ 
      message: "Successfully logged out from current device",
      remainingSessions: user.activeSessions.length
    });
  } catch (err) {
    error(`Error logging out: ${err.message}`);
    return res.status(500).json({ message: "Error logging out" });
  }
};

const logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.activeSessions = [];
    await user.save();
    
    log(`User logged out from all devices: ${user.email}`);
    return res.status(200).json({ message: "Successfully logged out from all devices" });
  } catch (err) {
    error(`Error logging out from all devices: ${err.message}`);
    return res.status(500).json({ message: "Error logging out from all devices" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    log(`Account deleted successfully: ${user.email}`);
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    error(`Error deleting account: ${err.message}`);
    return res.status(500).json({ message: "Error deleting account" });
  }
};

const socialLogin = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const token = generateToken({ id: user._id }, "1h");
    const refreshToken = user.generateRefreshToken();
    await user.save();

    log(`User logged in via social login: ${user.email}`);
    return res.status(200).json({ token, refreshToken, role: user.role, expiresIn: 3600 });
  } catch (err) {
    error(`Error during social login: ${err.message}`);
    return res.status(500).json({ message: "Error during social login" });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  refreshToken,
  forgotPassword,
  resetPassword,
  socialLogin,
  getProfile,
  updateProfile,
  resendVerificationEmail,
  changePassword,
  deleteAccount,
  logout,
  logoutAll,
};