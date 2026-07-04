const dotenv = require("dotenv");

dotenv.config();

const parseList = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";
const ALLOWED_ORIGINS = parseList(process.env.ALLOWED_ORIGINS, [
  FRONTEND_URL,
  "http://localhost:4200",
  "http://localhost:4201",
]);

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT || 5000,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  CALLBACK_URL: process.env.CALLBACK_URL || 'http://localhost:5000'
};
