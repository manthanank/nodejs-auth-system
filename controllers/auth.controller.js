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
const { v4: uuidv4 } = require("uuid");
const BlacklistedToken = require("../models/BlacklistedToken");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

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

    // Clean up expired sessions first
    if (Array.isArray(user.activeSessions)) {
      user.activeSessions = user.activeSessions.filter(
        (session) =>
          new Date(session.lastActive) >
          new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
    }

    // Handle force logout if specified
    const forceLogoutDeviceId = req.headers["force-logout"];
    if (forceLogoutDeviceId && user.activeSessions.length >= 4) {
      user.activeSessions = user.activeSessions.filter(
        (session) => session.deviceId !== forceLogoutDeviceId
      );
      await user.save();
    }

    // Check max sessions after potential force logout
    if (Array.isArray(user.activeSessions) && user.activeSessions.length >= 4) {
      return res.status(403).json({
        message:
          "Maximum device limit reached. Please logout from another device.",
        activeSessions: user.activeSessions,
        code: "MAX_SESSIONS",
      });
    }

    // Existing validations...

    const deviceId = req.headers["device-id"] || uuidv4();
    const userAgent = req.headers["user-agent"];

    // Handle session management...
    if (!Array.isArray(user.activeSessions)) {
      user.activeSessions = [];
    }

    const sessionIndex = user.activeSessions.findIndex(
      (session) => session.deviceId === deviceId
    );

    if (sessionIndex >= 0) {
      user.activeSessions[sessionIndex].lastActive = new Date();
      user.activeSessions[sessionIndex].userAgent = userAgent;
    } else {
      user.activeSessions.push({
        deviceId,
        lastActive: new Date(),
        userAgent,
      });
    }

    // Update user and generate tokens...
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    const refreshToken = user.generateRefreshToken();
    await user.save();

    const token = generateToken({ id: user._id }, "1h");

    // Send login notification email
    const emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    .header {
                        background-color: #dc3545;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }
                    .device-details {
                        background-color: #f8f9fa;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .warning-button {
                        display: inline-block;
                        padding: 15px 25px;
                        background-color: #dc3545;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                        text-align: center;
                    }
                    .warning-button a {
                        color: white;
                        text-decoration: none;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #777;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>New Login Alert</h1>
                    </div>
                    <div class="content">
                        <h2>Dear User,</h2>
                        <p>We detected a new login to your account. Here are the details:</p>
                        
                        <div class="device-details">
                            <h3>Device Information</h3>
                            <p><strong>Browser/Device:</strong> ${userAgent}</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        </div>
    
                        <p><strong>Was this you?</strong></p>
                        <p>If you don't recognize this activity, your account security may be at risk.</p>
                        
                        <center>
                            <div class="warning-button">
                                <a href="${
                                  process.env.FRONTEND_URL
                                }/change-password">Secure Your Account</a>
                            </div>
                        </center>
    
                        <p style="margin-top: 20px;">If this was you, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated security notification</p>
                        <p>© ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
    `;

    await sendEmail(user.email, "New Login Alert", emailContent);

    log(`User logged in successfully and notification sent: ${email}`);
    return res.status(200).json({
      token,
      refreshToken,
      role: user.role,
      expiresIn: 3600,
      deviceId,
      activeSessions: user.activeSessions,
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
      return res.status(400).json({ message: validationError.details[0].message });
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

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // Welcome email template
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .email-container {
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .header {
                background-color: #4CAF50;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }
            .content {
                background-color: white;
                padding: 30px;
                border-radius: 0 0 5px 5px;
            }
            .welcome-image {
                width: 100%;
                max-width: 300px;
                margin: 20px auto;
                display: block;
            }
            .button {
                display: inline-block;
                padding: 15px 25px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
            }
            .features {
                margin: 20px 0;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 5px;
            }
            .feature-item {
                margin: 10px 0;
                padding-left: 20px;
                position: relative;
            }
            .feature-item:before {
                content: "✓";
                color: #4CAF50;
                position: absolute;
                left: 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                margin: 0 10px;
                color: #4CAF50;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
                <h2>Hi ${email},</h2>
                <p>Thank you for joining us! We're excited to have you as a member of our community.</p>
                
                <div class="features">
                    <h3>What you can do with your account:</h3>
                    <div class="feature-item">Access secure authentication</div>
                    <div class="feature-item">Manage multiple sessions</div>
                    <div class="feature-item">Reset password when needed</div>
                    <div class="feature-item">Update your profile anytime</div>
                </div>

                <p>To get started, please verify your email address by clicking the button below:</p>
                <center>
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </center>

                <p style="margin-top: 20px;"><strong>Note:</strong> This verification link will expire in 24 hours for security reasons.</p>

                <div class="features">
                    <h3>Security Tips:</h3>
                    <div class="feature-item">Use a strong password</div>
                    <div class="feature-item">Enable two-factor authentication</div>
                    <div class="feature-item">Never share your login credentials</div>
                </div>
            </div>
            <div class="footer">
                <p>If you didn't create this account, please ignore this email or contact our support team.</p>
                <div class="social-links">
                    <a href="#">Twitter</a> |
                    <a href="#">Facebook</a> |
                    <a href="#">LinkedIn</a>
                </div>
                <p>© ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    await sendEmail(user.email, "Welcome to Our Platform!", emailContent);

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

    // Include current device ID in response
    const deviceId = req.deviceId;
    const userProfile = {
      ...user.toObject(),
      currentDeviceId: deviceId,
      // Filter active sessions to get only current session info
      currentSession: user.activeSessions.find(
        (session) => session.deviceId === deviceId
      ),
    };

    log("Profile fetched successfully");
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

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    .header {
                        background-color: #007bff;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }
                    .button {
                        display: inline-block;
                        padding: 15px 25px;
                        background-color: #007bff;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                        text-align: center;
                    }
                    .button a {
                        color: white;
                        text-decoration: none;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #777;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hello,</h2>
                        <p>We received a request to reset the password for your account.</p>
                        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
                        <center>
                            <div class="button">
                                <a href="${resetUrl}">Reset Password</a>
                            </div>
                        </center>
                        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from Your App Name</p>
                        <p>© ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
    `;

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

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    .header {
                        background-color: #28a745;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }
                    .button {
                        display: inline-block;
                        padding: 15px 25px;
                        background-color: #28a745;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                        text-align: center;
                    }
                    .button a {
                        color: white;
                        text-decoration: none;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #777;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>Verify Your Email Address</h1>
                    </div>
                    <div class="content">
                        <h2>Welcome!</h2>
                        <p>Thank you for registering. To complete your registration and activate your account, please verify your email address.</p>
                        <p>Click the button below to verify your email. For security reasons, this link will expire in 24 hours.</p>
                        <center>
                            <div class="button">
                                <a href="${verificationUrl}">Verify Email Address</a>
                            </div>
                        </center>
                        <p style="margin-top: 20px;">If you didn't create an account, please ignore this email or contact support if you have concerns.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply</p>
                        <p>© ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
    `;

    await sendEmail(user.email, "Email Verification", emailContent);

    log(`Verification email resent to: ${user.email}`);
    return res.status(200).json({ message: "Verification email resent" });
  } catch (err) {
    error(`Error resending verification email: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Error resending verification email" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { error: validationError } = resetPasswordSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ message: validationError.details[0].message });
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

    // Include current device ID and session info in response
    const deviceId = req.deviceId;
    const userProfile = {
      ...user.toObject(),
      currentDeviceId: deviceId,
      currentSession: user.activeSessions.find(
        (session) => session.deviceId === deviceId
      ),
    };

    log(`Profile updated successfully: ${user.email}`);
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
    if (Array.isArray(user.activeSessions)) {
      user.activeSessions = user.activeSessions.filter(
        (session) => session.deviceId !== deviceId
      );
    }

    // Blacklist the token
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const expiresAt = new Date(decodedToken.exp * 1000);
    await BlacklistedToken.create({ token, expiresAt });

    await user.save();
    log(`User logged out from device ${deviceId}: ${user.email}`);

    return res.status(200).json({
      message: "Successfully logged out from current device",
      remainingSessions: user.activeSessions.length,
    });
  } catch (err) {
    error(`Error logging out: ${err.message}`);
    return res.status(500).json({ message: "Error logging out" });
  }
};

const logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      log(`User not found: ${req.user.id}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Blacklist the token
    const token = req.headers.authorization.split(" ")[1];
    const expiresAt = new Date(Date.now() + 3600 * 1000); // Token expiry time (1 hour)
    await BlacklistedToken.create({ token, expiresAt });

    user.activeSessions = [];
    await user.save();

    log(`User logged out from all devices: ${user.email}`);
    return res
      .status(200)
      .json({ message: "Successfully logged out from all devices" });
  } catch (err) {
    error(`Error logging out from all devices: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Error logging out from all devices" });
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
    return res
      .status(200)
      .json({ token, refreshToken, role: user.role, expiresIn: 3600 });
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
