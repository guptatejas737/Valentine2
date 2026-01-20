const express = require("express");
const Invite = require("../models/Invite");
const Student = require("../models/Student");
const { ensureAuth } = require("../utils/auth");
const { generateToken } = require("../utils/token");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

router.get("/new", ensureAuth, async (req, res, next) => {
  try {
    const student = await Student.findById(req.query.studentId);
    if (!student) {
      return res.redirect("/dashboard");
    }
    res.render("create-invite", { student });
  } catch (err) {
    next(err);
  }
});

router.post("/", ensureAuth, async (req, res, next) => {
  try {
    const { studentId, message, q1, q2 } = req.body;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.redirect("/dashboard");
    }
    const invite = await Invite.create({
      sender: req.user._id,
      recipient: student._id,
      message,
      questions: { q1, q2 },
      secretToken: generateToken()
    });

    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const inviteLink = `${baseUrl}/i/${invite.secretToken}`;
    await sendMail({
      to: student.email,
      subject: "You have a new anonymous prom invite!",
      text: `Someone tagged you in an anonymous confession. View it here: ${inviteLink}`,
      html: `<p>Someone tagged you in an anonymous confession.</p><p><a href="${inviteLink}">Open your secret invite</a></p>`
    });

    res.redirect(`/invites/${invite._id}`);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", ensureAuth, async (req, res, next) => {
  try {
    const invite = await Invite.findById(req.params.id).populate("recipient");
    if (!invite || invite.sender.toString() !== req.user._id.toString()) {
      return res.redirect("/dashboard");
    }
    res.render("invite-details", { invite });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/edit", ensureAuth, async (req, res, next) => {
  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite || invite.sender.toString() !== req.user._id.toString()) {
      return res.redirect("/dashboard");
    }
    if (invite.status !== "pending") {
      return res.redirect(`/invites/${invite._id}`);
    }
    invite.message = req.body.message || invite.message;
    invite.questions.q1 = req.body.q1 || invite.questions.q1;
    invite.questions.q2 = req.body.q2 || invite.questions.q2;
    await invite.save();
    res.redirect(`/invites/${invite._id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

