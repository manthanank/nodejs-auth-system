/* eslint-env jest */
jest.mock("../models/User", () => ({
  findOne: jest.fn(),
}));

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

jest.mock("../utils/jwt.util", () => ({
  generateToken: jest.fn(() => "token"),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-device-id"),
}));

const User = require("../models/User");
const { login } = require("../controllers/auth.controller");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("login controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 400 for unknown user", async () => {
    User.findOne.mockResolvedValue(null);

    const req = {
      body: { email: "nouser@example.com", password: "secret123" },
      headers: {},
    };
    const res = createRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  test("returns 403 when account is locked", async () => {
    User.findOne.mockResolvedValue({ isLocked: true });

    const req = {
      body: { email: "locked@example.com", password: "secret123" },
      headers: {},
    };
    const res = createRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message:
        "Account is locked due to multiple failed login attempts. Please try again later.",
    });
  });

  test("increments attempts on wrong password", async () => {
    const mockUser = {
      isLocked: false,
      comparePassword: jest.fn().mockResolvedValue(false),
      incLoginAttempts: jest.fn().mockResolvedValue(undefined),
    };
    User.findOne.mockResolvedValue(mockUser);

    const req = {
      body: { email: "user@example.com", password: "wrongpass" },
      headers: {},
    };
    const res = createRes();

    await login(req, res);

    expect(mockUser.comparePassword).toHaveBeenCalledWith("wrongpass");
    expect(mockUser.incLoginAttempts).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });
});
