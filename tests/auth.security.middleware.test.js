/* eslint-env jest */
jest.mock("passport", () => ({
  authenticate: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../models/BlacklistedToken", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findById: jest.fn(),
}));

const passport = require("passport");
const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");
const sessionMiddleware = require("../middlewares/sessionMiddleware");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("security middleware negative paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("authMiddleware rejects missing token", async () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No token provided",
      error: "token_missing",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("authMiddleware rejects blacklisted token", async () => {
    BlacklistedToken.findOne.mockResolvedValue({ token: "blocked-token" });

    const req = { headers: { authorization: "Bearer blocked-token" } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token has been invalidated",
      error: "token_blacklisted",
    });
  });

  test("authMiddleware rejects expired token", async () => {
    BlacklistedToken.findOne.mockResolvedValue(null);
    jwt.verify.mockImplementation(() => {
      const err = new Error("expired");
      err.name = "TokenExpiredError";
      throw err;
    });

    const req = { headers: { authorization: "Bearer expired-token" } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token expired",
      error: "token_expired",
    });
  });

  test("authMiddleware rejects when passport has no user", async () => {
    BlacklistedToken.findOne.mockResolvedValue(null);
    jwt.verify.mockReturnValue({ id: "user-1" });
    passport.authenticate.mockImplementation((strategy, options, cb) => {
      return () => cb(null, null, { message: "Unauthorized" });
    });

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized",
      error: "token_invalid",
    });
  });

  test("sessionMiddleware rejects missing device-id", async () => {
    BlacklistedToken.findOne.mockResolvedValue(null);

    const req = {
      headers: { authorization: "Bearer valid-token" },
      cookies: {},
      user: { id: "user-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await sessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Device ID required" });
  });

  test("sessionMiddleware rejects blacklisted token", async () => {
    BlacklistedToken.findOne.mockResolvedValue({ token: "blocked-token" });

    const req = {
      headers: {
        authorization: "Bearer blocked-token",
        "device-id": "device-1",
      },
      cookies: {},
      user: { id: "user-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await sessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Session is no longer valid",
      code: "INVALID_SESSION",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("sessionMiddleware rejects when no active session exists", async () => {
    BlacklistedToken.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValue({
      activeSessions: [{ deviceId: "another-device", lastActive: new Date() }],
      save: jest.fn().mockResolvedValue(undefined),
    });

    const req = {
      headers: {
        authorization: "Bearer valid-token",
        "device-id": "device-1",
      },
      cookies: {},
      user: { id: "user-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await sessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No active session found for this device",
      code: "INVALID_SESSION",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
