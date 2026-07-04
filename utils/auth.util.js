const { NODE_ENV } = require("../config/env");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV === "production",
  sameSite: NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";

const getAuthTokenFromRequest = (req) => {
  const authorizationHeader = req.headers.authorization;
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.split(" ")[1];
  }

  return req.cookies?.[ACCESS_TOKEN_COOKIE] || null;
};

const getRefreshTokenFromRequest = (req) => {
  return req.body?.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE] || null;
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
};

module.exports = {
  getAuthTokenFromRequest,
  getRefreshTokenFromRequest,
  setAuthCookies,
  clearAuthCookies,
};