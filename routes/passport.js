const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../app/models/User');

passport.use(new GoogleStrategy({
    clientID: '785598983692-igiasirmagu9p3du2a04j67nfvkp81p7.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: '/api/v1/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create the user in your database
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({ googleId: profile.id, email: profile.emails[0].value, name: profile.displayName });
        await user.save();
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

module.exports = passport;
