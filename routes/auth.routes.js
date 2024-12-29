const express = require("express");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  verifyEmail,
  refreshToken,
  updateProfile,
  logout,
} = require("../controllers/auth.controller");
const passport = require("passport");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  getProfile
);
router.put(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  updateProfile
);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/refresh-token", refreshToken);
router.get(
  "/user",
  passport.authenticate("jwt", { session: false }),
  roleMiddleware(["user"]),
  (req, res) => {
    res.status(200).json({ message: "Welcome, user!" });
  }
);
router.get(
  "/admin",
  passport.authenticate("jwt", { session: false }),
  roleMiddleware(["admin"]),
  (req, res) => {
    res.status(200).json({ message: "Welcome, admin!" });
  }
);
router.post(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  logout
);

module.exports = router;
