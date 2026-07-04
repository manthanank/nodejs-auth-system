/* eslint-env jest */
const roleMiddleware = require("../middlewares/roleMiddleware");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("roleMiddleware", () => {
  test("returns 403 when user role is not allowed", () => {
    const middleware = roleMiddleware(["admin"]);
    const req = { user: { role: "user" } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next when user role is allowed", () => {
    const middleware = roleMiddleware(["admin", "user"]);
    const req = { user: { role: "user" } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
