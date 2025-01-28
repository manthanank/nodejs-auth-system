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
  socialLogin,
} = require("../controllers/auth.controller");
const passport = require("passport");
const roleMiddleware = require("../middlewares/roleMiddleware");

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
 *         description: Account locked
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *       500:
 *         description: Error fetching profile
 */
router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  getProfile
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
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
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Error updating profile
 */
router.put(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  updateProfile
);

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
  passport.authenticate("jwt", { session: false }),
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
  passport.authenticate("jwt", { session: false }),
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
 *     responses:
 *       200:
 *         description: Welcome, user!
 *       403:
 *         description: Access denied
 */
router.get(
  "/user",
  passport.authenticate("jwt", { session: false }),
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
 *     responses:
 *       200:
 *         description: Welcome, admin!
 *       403:
 *         description: Access denied
 */
router.get(
  "/admin",
  passport.authenticate("jwt", { session: false }),
  roleMiddleware(["admin"]),
  (req, res) => {
    res.status(200).json({ message: "Welcome, admin!" });
  }
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 *       500:
 *         description: Error logging out
 */
router.post(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  logout
);

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

module.exports = router;
