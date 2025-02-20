const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');

const sessionMiddleware = async (req, res, next) => {
  try {
    // Check if token is blacklisted first
    const token = req.headers.authorization?.split(" ")[1];
    const isBlacklisted = await BlacklistedToken.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ 
        message: "Session is no longer valid",
        code: "INVALID_SESSION"
      });
    }

    const currentDeviceId = req.headers['device-id'] || req.cookies['device-id'];
    if (!currentDeviceId) {
      return res.status(401).json({ message: "Device ID required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if device has an active session
    const hasActiveSession = user.activeSessions?.some(
      session => session.deviceId === currentDeviceId
    );

    if (!hasActiveSession) {
      return res.status(401).json({ 
        message: "No active session found for this device",
        code: "INVALID_SESSION"
      });
    }

    // Update lastActive for existing session
    if (Array.isArray(user.activeSessions)) {
      const sessionIndex = user.activeSessions.findIndex(
        session => session.deviceId === currentDeviceId
      );
      if (sessionIndex >= 0) {
        user.activeSessions[sessionIndex].lastActive = new Date();
      }
    }

    await user.save();
    req.deviceId = currentDeviceId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = sessionMiddleware;