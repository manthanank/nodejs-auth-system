const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const MAX_SESSIONS = 4;

const sessionMiddleware = async (req, res, next) => {
  try {
    const currentDeviceId = req.headers['device-id'] || uuidv4();
    const userAgent = req.headers['user-agent'];
    const user = await User.findById(req.user.id);

    // Remove expired sessions (older than 24 hours)
    user.activeSessions = user.activeSessions.filter(session => 
      session.lastActive > Date.now() - (24 * 60 * 60 * 1000)
    );

    // Check if current device has an existing session
    const existingSession = user.activeSessions.find(
      session => session.deviceId === currentDeviceId
    );

    if (existingSession) {
      // Update last active time for existing session
      existingSession.lastActive = new Date();
    } else {
      // Check if max sessions limit reached
      if (user.activeSessions.length >= MAX_SESSIONS) {
        return res.status(401).json({
          message: 'Maximum device limit reached. Please logout from another device.',
          currentSessions: user.activeSessions.map(session => ({
            deviceId: session.deviceId,
            userAgent: session.userAgent,
            lastActive: session.lastActive
          }))
        });
      }

      // Add new session
      user.activeSessions.push({
        deviceId: currentDeviceId,
        lastActive: new Date(),
        userAgent
      });
    }

    await user.save();
    req.deviceId = currentDeviceId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = sessionMiddleware;