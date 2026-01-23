const express = require("express");
const Invite = require("../models/Invite");
const { ensureAuth } = require("../utils/auth");

const router = express.Router();

router.get("/", ensureAuth, async (req, res, next) => {
  try {
    const invites = await Invite.find({ sender: req.user._id })
      .populate("recipient")
      .sort({ createdAt: -1 });
    const safeInvites = invites.filter((invite) => invite.recipient);
    const stats = {
      totalSent: safeInvites.length,
      accepted: safeInvites.filter((invite) => invite.status === "accepted").length
    };
    res.render("dashboard", { invites: safeInvites, stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

