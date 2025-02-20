const User = require("../models/User");
const { log, error } = require("../utils/logger");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const BlacklistedToken = require("../models/BlacklistedToken");

const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      log(`User not found: ${req.user.id}`);
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(user.activeSessions)) {
      user.activeSessions = [];
    }

    // Fix: Use strict comparison with toString()
    const currentDeviceId = req.deviceId.toString();

    const currentUserSessions = user.activeSessions
      .filter((session) => {
        if (!session || !session.lastActive) return false;
        const lastActive = new Date(session.lastActive);
        return lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000);
      })
      .map((session) => ({
        deviceId: session.deviceId,
        userAgent: session.userAgent,
        lastActive: session.lastActive,
        // Fix: Compare string values
        isCurrentDevice: session.deviceId.toString() === currentDeviceId,
      }));

    user.activeSessions = currentUserSessions;
    await user.save();

    log(
      `Found ${currentUserSessions.length} active sessions for user ${req.user.id}`
    );
    return res.status(200).json({
      sessions: currentUserSessions,
      currentDeviceId: req.deviceId,
      totalActiveSessions: currentUserSessions.length,
      success: true,
    });
  } catch (err) {
    error(`Error fetching sessions: ${err.message}`);
    return res.status(500).json({ message: "Error fetching sessions" });
  }
};

const deleteSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { deviceId } = req.params;

    // Check if session exists
    const sessionExists = user.activeSessions.some(
      session => session.deviceId === deviceId
    );

    if (!sessionExists) {
      return res.status(404).json({ 
        message: "Session not found",
        code: "SESSION_NOT_FOUND"
      });
    }

    // Get session before deleting for verification
    const sessionToDelete = user.activeSessions.find(
      session => session.deviceId === deviceId
    );

    // Check if session is still active
    const lastActive = new Date(sessionToDelete.lastActive);
    const isActive = lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (!isActive) {
      return res.status(400).json({
        message: "Session has already expired",
        code: "SESSION_EXPIRED"
      });
    }

    // Remove the session
    user.activeSessions = user.activeSessions.filter(
      session => session.deviceId !== deviceId
    );

    await user.save();

    // If we're deleting the current session, blacklist its token
    if (deviceId === req.deviceId) {
      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = jwt.verify(token, JWT_SECRET);
      const expiresAt = new Date(decodedToken.exp * 1000);
      
      await BlacklistedToken.create({ token, expiresAt });
    }

    log(`Session deleted successfully for device ${deviceId}`);
    return res.status(200).json({
      message: "Session deleted successfully",
      remainingSessions: user.activeSessions.length
    });

  } catch (err) {
    error(`Error deleting session: ${err.message}`);
    return res.status(500).json({ message: "Error deleting session" });
  }
};

const getUsersByDeviceId = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const users = await User.find({
      "activeSessions.deviceId": deviceId,
    }).select("-password");
    if (!users.length) {
      return res
        .status(404)
        .json({ message: "No users found with the given device ID" });
    }
    log(`Users fetched successfully for device ID: ${deviceId}`);
    return res.status(200).json(users);
  } catch (err) {
    error(`Error fetching users by device ID: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Error fetching users by device ID" });
  }
};

module.exports = {
  getSessions,
  deleteSession,
  getUsersByDeviceId,
};
