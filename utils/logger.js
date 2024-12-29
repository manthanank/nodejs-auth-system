const log = (message) => {
  console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
};

const error = (message) => {
  console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
};

module.exports = { log, error };
