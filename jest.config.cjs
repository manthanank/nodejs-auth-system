module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: [
    "controllers/**/*.js",
    "validations/**/*.js",
    "middlewares/**/*.js",
  ],
};
