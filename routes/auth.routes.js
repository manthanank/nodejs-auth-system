const express = require("express");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  verifyEmail,
  refreshToken,
  resendVerificationEmail,
  changePassword,
  deleteAccount,
  updateProfile,
  logout,
  logoutAll,
  socialLogin,
} = require("../controllers/auth.controller");
const passport = require("passport");
const {
  getSessions,
  deleteSession,
  getUsersByDeviceId,
} = require("../controllers/session.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const sessionMiddleware = require("../middlewares/sessionMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: device-id
 *         schema:
 *           type: string
 *         description: Unique device identifier (optional - will be generated if not provided)
 *       - in: header
 *         name: force-logout
 *         schema:
 *           type: string
 *         description: Device ID to logout before login (optional)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Invalid credentials
 *       403:
 *         description: Account locked or maximum sessions reached
 */
router.post("/login", login);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   parameters:
 *     DeviceIdHeader:
 *       in: header
 *       name: device-id
 *       schema:
 *         type: string
 *       description: Unique device identifier
 *       required: true
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DeviceIdHeader'
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 currentDeviceId:
 *                   type: string
 *                   description: Current device ID
 *                 currentSession:
 *                   type: object
 *                   properties:
 *                     deviceId:
 *                       type: string
 *                     lastActive:
 *                       type: string
 *                       format: date-time
 *                     userAgent:
 *                       type: string
 *       401:
 *         description: Unauthorized or invalid session
 *       500:
 *         description: Error fetching profile
 */
router.get("/profile", authMiddleware, sessionMiddleware, getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DeviceIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   format: uuid
 *                   description: User's unique identifier
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: User's email address
 *                 role:
 *                   type: string
 *                   enum: [user, admin]
 *                   description: User's role
 *                 isVerified:
 *                   type: boolean
 *                   description: Email verification status
 *                 loginAttempts:
 *                   type: number
 *                   description: Number of failed login attempts
 *                 lockUntil:
 *                   type: number
 *                   description: Timestamp until account is locked
 *                 mre:
 *                   type: string
 *                   description: Most Recent Email
 *                 currentDeviceId:
 *                   type: string
 *                   description: Current device ID
 *                 activeSessions:
 *                   type: array
 *                   description: List of active sessions
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceId:
 *                         type: string
 *                         description: Unique device identifier
 *                       lastActive:
 *                         type: string
 *                         format: date-time
 *                         description: Last activity timestamp
 *                       userAgent:
 *                         type: string
 *                         description: Browser/device user agent
 *                 currentSession:
 *                   type: object
 *                   properties:
 *                     deviceId:
 *                       type: string
 *                       description: Current device identifier
 *                     lastActive:
 *                       type: string
 *                       format: date-time
 *                       description: Last activity timestamp
 *                     userAgent:
 *                       type: string
 *                       description: Current browser/device user agent
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Account creation timestamp
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       400:
 *         description: Bad request or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *       401:
 *         description: Unauthorized or invalid session
 *       500:
 *         description: Error updating profile
 */
router.put("/profile", authMiddleware, sessionMiddleware, updateProfile);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent
 *       400:
 *         description: User not found
 *       500:
 *         description: Email could not be sent
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   put:
 *     summary: Reset password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Error resetting password
 */
router.put("/reset-password/:token", resetPassword);

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verify email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Error verifying email
 */
router.get("/verify-email/:token", verifyEmail);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Invalid refresh token
 *       500:
 *         description: Error refreshing token
 */
router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /api/auth/resend-verification-email:
 *   post:
 *     summary: Resend verification email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email resent
 *       400:
 *         description: User not found or email already verified
 *       500:
 *         description: Error resending verification email
 */
router.post("/resend-verification-email", resendVerificationEmail);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Error changing password
 */
router.put(
  "/change-password",
  authMiddleware,
  sessionMiddleware,
  changePassword
);

/**
 * @swagger
 * /api/auth/delete-account:
 *   delete:
 *     summary: Delete account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: User not found
 *       500:
 *         description: Error deleting account
 */
router.delete(
  "/delete-account",
  authMiddleware,
  sessionMiddleware,
  deleteAccount
);

/**
 * @swagger
 * /api/auth/user:
 *   get:
 *     summary: User route
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DeviceIdHeader'
 *     responses:
 *       200:
 *         description: Welcome, user!
 *       403:
 *         description: Access denied
 */
router.get(
  "/user",
  authMiddleware,
  sessionMiddleware,
  roleMiddleware(["user"]),
  (req, res) => {
    res.status(200).json({ message: "Welcome, user!" });
  }
);

/**
 * @swagger
 * /api/auth/admin:
 *   get:
 *     summary: Admin route
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DeviceIdHeader'
 *     responses:
 *       200:
 *         description: Welcome, admin!
 *       403:
 *         description: Access denied
 */
router.get(
  "/admin",
  authMiddleware,
  sessionMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    res.status(200).json({ message: "Welcome, admin!" });
  }
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user from current device
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DeviceIdHeader'
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully logged out from current device
 *                 remainingSessions:
 *                   type: integer
 *                   description: Number of remaining active sessions
 *       401:
 *         description: Unauthorized or invalid session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session is no longer valid
 *                 code:
 *                   type: string
 *                   example: INVALID_SESSION
 *       500:
 *         description: Error logging out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error logging out
 */
router.post("/logout", authMiddleware, sessionMiddleware, logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout user from all devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out from all devices successfully
 *       500:
 *         description: Error logging out from all devices
 */
router.post("/logout-all", authMiddleware, logoutAll);

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["profile", "email"],
  }),
  (req, res) => {
    res.send("redirecting to github...");
  }
);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
  (req, res) => {
    res.send("redirecting to google...");
  }
);

router.get("/github/callback", passport.authenticate("github"), socialLogin);

router.get("/google/callback", passport.authenticate("google"), socialLogin);

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DeviceIdHeader'
 *     responses:
 *       200:
 *         description: Sessions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - sessions
 *                 - currentDeviceId
 *                 - totalActiveSessions
 *                 - success
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required:
 *                       - deviceId
 *                       - userAgent
 *                       - lastActive
 *                       - isCurrentDevice
 *                     properties:
 *                       deviceId:
 *                         type: string
 *                         description: Unique identifier for the device
 *                       userAgent:
 *                         type: string
 *                         description: Browser/device user agent string
 *                       lastActive:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of last activity
 *                       isCurrentDevice:
 *                         type: boolean
 *                         description: Indicates if this is the current device
 *                 currentDeviceId:
 *                   type: string
 *                   description: Device ID of the current session
 *                 totalActiveSessions:
 *                   type: integer
 *                   minimum: 0
 *                   description: Total number of active sessions
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the request was successful
 *       404:
 *         description: User not found
 *       500:
 *         description: Error fetching sessions
 */
router.get("/sessions", authMiddleware, sessionMiddleware, getSessions);

/**
 * @swagger
 * /api/auth/sessions/{deviceId}:
 *   delete:
 *     summary: Delete a session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       500:
 *         description: Error deleting session
 */
router.delete("/sessions/:deviceId", authMiddleware, deleteSession);

/**
 * @swagger
 * /api/auth/users/device/{deviceId}:
 *   get:
 *     summary: Get users by device ID
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       404:
 *         description: No users found with the given device ID
 *       500:
 *         description: Error fetching users by device ID
 */
router.get("/users/device/:deviceId", authMiddleware, getUsersByDeviceId);

module.exports = router;
