/* eslint-env jest */
process.env.API_SECRET = process.env.API_SECRET || "test-secret";

jest.mock("../config/passport", () => ({}));
jest.mock("../middlewares/authMiddleware", () => (req, res, next) => {
  req.user = { id: "user-1", role: "user" };
  next();
});
jest.mock("../middlewares/sessionMiddleware", () => (req, res, next) => {
  req.deviceId = "device-1";
  next();
});
jest.mock("../middlewares/roleMiddleware", () => () => (req, res, next) => {
  next();
});

jest.mock("../utils/logger", () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../utils/email", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 3600 })),
}));

jest.mock("../models/BlacklistedToken", () => ({
  create: jest.fn().mockResolvedValue(undefined),
  findOne: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  getResetPasswordHash: jest.fn(() => "hashed-reset-token"),
}));

const request = require("supertest");
const User = require("../models/User");
const { app } = require("../index");

const createUserDoc = () => ({
  _id: "user-1",
  email: "user@example.com",
  role: "user",
  activeSessions: [
    {
      deviceId: "device-1",
      lastActive: new Date(),
      userAgent: "jest-agent",
    },
  ],
  save: jest.fn().mockResolvedValue(undefined),
  toObject() {
    return {
      _id: this._id,
      email: this.email,
      role: this.role,
      activeSessions: this.activeSessions,
    };
  },
});

describe("auth protected API integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/auth/profile returns profile for authenticated user", async () => {
    const userDoc = createUserDoc();
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(userDoc),
    });

    const response = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("email", "user@example.com");
    expect(response.body).toHaveProperty("currentDeviceId", "device-1");
  });

  test("GET /api/auth/sessions returns active sessions", async () => {
    const userDoc = createUserDoc();
    User.findById.mockResolvedValue(userDoc);

    const response = await request(app)
      .get("/api/auth/sessions")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("totalActiveSessions", 1);
    expect(response.body.sessions[0]).toHaveProperty("isCurrentDevice", true);
  });

  test("POST /api/auth/logout logs out current device", async () => {
    const userDoc = createUserDoc();
    User.findById.mockResolvedValue(userDoc);

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Successfully logged out from current device"
    );
    expect(response.body).toHaveProperty("remainingSessions", 0);
  });

  test("GET /api/auth/user allows user route", async () => {
    const response = await request(app)
      .get("/api/auth/user")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Welcome, user!" });
  });
});
