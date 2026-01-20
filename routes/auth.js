const express = require("express");
const passport = require("passport");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/failed"
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

router.get("/failed", (req, res) => {
  res.status(401).render("error", {
    title: "Login failed",
    message: "Please login with your institute email."
  });
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

module.exports = router;

