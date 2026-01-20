const express = require("express");
const Invite = require("../models/Invite");
const { ensureAuth } = require("../utils/auth");

const router = express.Router();

router.get("/", ensureAuth, async (req, res, next) => {
  try {
    const invites = await Invite.find({ sender: req.user._id })
      .populate("recipient")
      .sort({ createdAt: -1 });
    res.render("dashboard", { invites });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

