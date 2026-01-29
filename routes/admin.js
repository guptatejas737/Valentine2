const express = require("express");
const Feedback = require("../models/Feedback");
const Invite = require("../models/Invite");

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

router.get("/invites", async (req, res, next) => {
  try {
    const invites = await Invite.find()
      .populate("sender", "name email")
      .populate("recipient", "name email rollNumber")
      .sort({ createdAt: -1 })
      .lean();

    const stats = invites.reduce(
      (acc, invite) => {
        acc.total += 1;
        acc[invite.status] = (acc[invite.status] || 0) + 1;
        return acc;
      },
      { total: 0, pending: 0, accepted: 0, maybe: 0, rejected: 0 }
    );

    res.render("admin-invites", { invites, stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

