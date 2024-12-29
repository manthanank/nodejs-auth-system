const { log } = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  log(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
