const { JWT_SECRET } = require("../config/env");
const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");
const User = require("../models/User");
const { getAuthTokenFromRequest } = require("../utils/auth.util");

const authMiddleware = async (req, res, next) => {
  const token = getAuthTokenFromRequest(req);
  
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

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
        error: "token_invalid"
      });
    }

    req.user = user;
    req.authToken = token;
    return next();
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
};

module.exports = authMiddleware;