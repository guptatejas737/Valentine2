const express = require("express");
const Feedback = require("../models/Feedback");
const { ensureAuth } = require("../utils/auth");

const router = express.Router();

router.get("/", ensureAuth, (req, res) => {
  res.render("feedback");
});

router.post("/", ensureAuth, async (req, res, next) => {
  try {
    const message = (req.body.message || "").trim().slice(0, 2000);
    if (!message) {
      return res.status(400).render("error", {
        title: "Empty feedback",
        message: "Please write something before submitting."
      });
    }
    await Feedback.create({
      user: req.user._id,
      message
    });
    res.render("feedback-thanks");
  } catch (err) {
    next(err);
  }
});

module.exports = router;

