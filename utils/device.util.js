const detectDevice = (req) => {
  const userAgent = req.headers['user-agent'];
  return userAgent;
};

module.exports = { detectDevice };