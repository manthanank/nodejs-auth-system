const passport = require("passport");
const { JWT_SECRET } = require("../config/env");
const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");

const authMiddleware = async (req, res, next) => {
  // Get token from header
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({
      message: "No token provided",
      error: "token_missing"
    });
  }

  // Check if token is blacklisted
  const blacklistedToken = await BlacklistedToken.findOne({ token });
  if (blacklistedToken) {
    return res.status(401).json({
      message: "Token has been invalidated",
      error: "token_blacklisted"
    });
  }

  // Verify token is still valid (not expired)
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        error: "token_expired"
      });
    }
    return res.status(401).json({
      message: "Invalid token",
      error: "token_invalid"
    });
  }

  // Use passport to authenticate
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        message: "Authentication error",
        error: err.message
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        message: info?.message || "Unauthorized",
        error: "token_invalid" 
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

module.exports = authMiddleware;