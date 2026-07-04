/* eslint-env jest */
process.env.API_SECRET = process.env.API_SECRET || "test-secret";

jest.mock("../config/passport", () => ({}));
jest.mock("../utils/logger", () => ({
  log: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../utils/email", () => ({
  sendEmail: jest.fn(),
}));
jest.mock("../models/BlacklistedToken", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("../models/User", () => ({
  findOne: jest.fn(),
  getResetPasswordHash: jest.fn(() => "hashed-reset-token"),
}));

const request = require("supertest");
const User = require("../models/User");
const { app } = require("../index");

describe("auth API integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /health returns API health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test("POST /api/auth/register rejects invalid payload", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "user@example.com",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("POST /api/auth/login returns invalid credentials for missing user", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post("/api/auth/login").send({
      email: "nouser@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid credentials" });
  });

  test("POST /api/auth/forgot-password returns user not found", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nouser@example.com" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "User not found" });
  });

  test("PUT /api/auth/reset-password/:token returns invalid token", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/auth/reset-password/fake-token")
      .send({ password: "newsecret123" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid or expired token" });
  });
});
