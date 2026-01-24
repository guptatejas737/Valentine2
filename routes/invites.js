const express = require("express");
const Invite = require("../models/Invite");
const Student = require("../models/Student");
const { ensureAuth } = require("../utils/auth");
const { generateToken } = require("../utils/token");
const { sendMail } = require("../utils/mailer");
const { inviteEmail } = require("../utils/emailTemplates");

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

router.get("/", ensureAuth, (req, res) => res.redirect("/dashboard"));

router.post("/", ensureAuth, async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const whyYou = (req.body.whyYou || "").trim().slice(0, 220);
    const greenFlag = (req.body.greenFlag || "").trim().slice(0, 120);
    const passion = (req.body.passion || "").trim().slice(0, 120);
    const trait = (req.body.trait || "").trim().slice(0, 120);
    const message = (req.body.message || "").trim().slice(0, 600);
    const student = await Student.findById(studentId);
    if (!student) {
      return res.redirect("/dashboard");
    }
    if (!whyYou || !greenFlag || !passion || !trait || !message) {
      return res.status(400).render("error", {
        title: "Missing details",
        message: "Please complete all sections before sending your invite."
      });
    }
    const cooldownMs = 0 * 2 * 24 * 60 * 60 * 1000;
    const latestInvite = await Invite.findOne({
      sender: req.user._id,
      recipient: student._id
    }).sort({ createdAt: -1 });
    if (latestInvite && Date.now() - latestInvite.createdAt.getTime() < cooldownMs) {
      return res.status(429).render("error", {
        title: "Slow down",
        message:
          "You already sent a request to this person recently. Please wait at least 2 days before sending another request."
      });
    }

    const invite = await Invite.create({
      sender: req.user._id,
      recipient: student._id,
      message,
      whyYou,
      about: {
        greenFlag,
        passion,
        trait
      },
      secretToken: generateToken()
    });

    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const inviteLink = `${baseUrl}/i/${invite.secretToken}`;
    const recipientEmail = student.getContactEmail();
    if (!recipientEmail) {
      return res.status(400).render("error", {
        title: "Missing email",
        message:
          "We could not determine an email for this student. Please try adding them manually."
      });
    }
    const mailContent = inviteEmail({
      inviteLink,
      recipientName: student.name
    });
    await sendMail({
      to: recipientEmail,
      subject: "You have a new anonymous prom invite!",
      text: mailContent.text,
      html: mailContent.html
    });

    // Force a GET after POST to avoid method-preserving redirects.
    res.redirect(303, "/dashboard");
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
      return res.redirect(303, `/invites/${invite._id}`);
    }
    const whyYou = (req.body.whyYou || "").trim().slice(0, 220);
    const greenFlag = (req.body.greenFlag || "").trim().slice(0, 120);
    const passion = (req.body.passion || "").trim().slice(0, 120);
    const trait = (req.body.trait || "").trim().slice(0, 120);
    const message = (req.body.message || "").trim().slice(0, 600);
    if (!whyYou || !greenFlag || !passion || !trait || !message) {
      return res.status(400).render("error", {
        title: "Missing details",
        message: "Please complete all sections before updating your invite."
      });
    }
    invite.whyYou = whyYou;
    invite.about = invite.about || {};
    invite.about.greenFlag = greenFlag;
    invite.about.passion = passion;
    invite.about.trait = trait;
    invite.message = message;
    await invite.save();
    // Force a GET after POST to avoid method-preserving redirects.
    res.redirect(303, `/invites/${invite._id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

