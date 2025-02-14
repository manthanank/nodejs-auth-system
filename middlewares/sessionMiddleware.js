const { v4: uuidv4 } = require('uuid'); // Add uuid to package.json dependencies
const User = require('../models/User');

const sessionMiddleware = async (req, res, next) => {
  try {
    const currentDeviceId = req.headers['device-id'] || uuidv4();
    const user = await User.findById(req.user.id);

    if (user.activeSession && user.activeSession.deviceId !== currentDeviceId) {
      return res.status(401).json({ 
        message: 'Another session is active. Please logout from other devices first.'
      });
    }

    user.activeSession = {
      deviceId: currentDeviceId,
      lastActive: new Date()
    };
    await user.save();

    req.deviceId = currentDeviceId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = sessionMiddleware;