/* eslint-env jest */
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
} = require("../validations/auth.validation");

describe("auth validation schemas", () => {
  test("registerSchema accepts valid payload", () => {
    const { error } = registerSchema.validate({
      email: "user@example.com",
      password: "secret123",
    });
    expect(error).toBeUndefined();
  });

  test("loginSchema rejects invalid email", () => {
    const { error } = loginSchema.validate({
      email: "invalid-email",
      password: "secret123",
    });
    expect(error).toBeDefined();
  });

  test("forgotPasswordSchema requires email", () => {
    const { error } = forgotPasswordSchema.validate({});
    expect(error).toBeDefined();
  });

  test("resetPasswordSchema enforces minimum length", () => {
    const { error } = resetPasswordSchema.validate({ password: "123" });
    expect(error).toBeDefined();
  });

  test("profileSchema accepts valid email", () => {
    const { error } = profileSchema.validate({ email: "profile@example.com" });
    expect(error).toBeUndefined();
  });
});
