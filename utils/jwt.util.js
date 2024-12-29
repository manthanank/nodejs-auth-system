const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

const generateToken = (payload, expiresIn) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

module.exports = { generateToken };
