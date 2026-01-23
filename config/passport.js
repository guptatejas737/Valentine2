const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

const normalizeBaseUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+$/, "");
};

module.exports = function configurePassport(passport) {
  const baseUrl =
    normalizeBaseUrl(process.env.APP_BASE_URL) ||
    `http://localhost:${process.env.PORT || 3000}`;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL || `${baseUrl}/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0]?.value;
          const domainAllowed =
            process.env.ALLOWED_EMAIL_DOMAIN &&
            email &&
            email.endsWith(`@${process.env.ALLOWED_EMAIL_DOMAIN}`);

          if (!domainAllowed) {
            return done(null, false, {
              message: "Please use your institute email to login."
            });
          }

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatar: profile.photos && profile.photos[0]?.value
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};

