const express = require("express");
const Invite = require("../models/Invite");
const Student = require("../models/Student");
const { ensureAuth } = require("../utils/auth");
const { generateToken } = require("../utils/token");
const { sendMail, buildInviteEmail } = require("../utils/mailer");

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
    const roll = (student.rollNumber || "").trim().toLowerCase();
    const domain = process.env.ALLOWED_EMAIL_DOMAIN || "smail.iitm.ac.in";
    const recipientEmail = student.email || (roll ? `${roll}@${domain}` : "");
    const inviteEmail = buildInviteEmail({
      recipientName: student.name,
      inviteLink
    });
    await sendMail({
      to: recipientEmail,
      subject: "You have a secret prom invite",
      text: inviteEmail.text,
      html: inviteEmail.html
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

