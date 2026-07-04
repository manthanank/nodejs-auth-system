/* eslint-env jest */
const request = require("supertest");

const loadAppWithRole = (role) => {
  jest.resetModules();
  process.env.API_SECRET = process.env.API_SECRET || "test-secret";

  jest.doMock("../config/passport", () => ({}));
  jest.doMock("../middlewares/authMiddleware", () => (req, res, next) => {
    req.user = { id: "user-1", role };
    next();
  });
  jest.doMock("../middlewares/sessionMiddleware", () => (req, res, next) => {
    req.deviceId = "device-1";
    next();
  });

  jest.doMock("../utils/logger", () => ({
    log: jest.fn(),
    error: jest.fn(),
  }));

  const { app } = require("../index");
  return app;
};

describe("auth role route integration", () => {
  test("GET /api/auth/admin denies non-admin user", async () => {
    const app = loadAppWithRole("user");

    const response = await request(app)
      .get("/api/auth/admin")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Access denied" });
  });

  test("GET /api/auth/admin allows admin user", async () => {
    const app = loadAppWithRole("admin");

    const response = await request(app)
      .get("/api/auth/admin")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Welcome, admin!" });
  });

  test("GET /api/auth/user allows user role", async () => {
    const app = loadAppWithRole("user");

    const response = await request(app)
      .get("/api/auth/user")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Welcome, user!" });
  });

  test("GET /api/auth/user denies admin role", async () => {
    const app = loadAppWithRole("admin");

    const response = await request(app)
      .get("/api/auth/user")
      .set("Authorization", "Bearer mocked-token")
      .set("device-id", "device-1");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Access denied" });
  });
});
