const express = require("express");
const Feedback = require("../models/Feedback");

const router = express.Router();

const ADMIN_USER = "admin";
const ADMIN_PASS = "wecanseeu";

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Authentication required");
  }
  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Admin Panel"');
  return res.status(401).send("Invalid credentials");
};

router.use(basicAuth);

router.get("/", async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.render("admin-feedbacks", { feedbacks });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

