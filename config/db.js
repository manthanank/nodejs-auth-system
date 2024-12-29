const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");
const { log, error } = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    log("Database connected successfully");
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;