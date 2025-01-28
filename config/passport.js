const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../models/User");
const { JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALLBACK_URL } = require("./env");
const { error } = require("../utils/logger");

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

const jwtStrategy = new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    const user = await User.findById(jwtPayload.id);
    if (user) return done(null, user);
    return done(null, false);
  } catch (err) {
    return done(err, false);
  }
});

const githubStrategy = new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: `${CALLBACK_URL}/api/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({
        email: profile.emails[0].value,
        password: Math.random().toString(36),
        isVerified: true
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    error('GitHub auth error:', err);
    return done(err, null);
  }
});

const googleStrategy = new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: `${CALLBACK_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({
        email: profile.emails[0].value,
        password: Math.random().toString(36),
        isVerified: true
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    error('Google auth error:', err);
    return done(err, null);
  }
});

passport.use(jwtStrategy);
passport.use(githubStrategy);
passport.use(googleStrategy);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;