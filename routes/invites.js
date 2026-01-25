const express = require("express");
const Invite = require("../models/Invite");
const Student = require("../models/Student");
const { ensureAuth } = require("../utils/auth");
const { generateToken } = require("../utils/token");
const { sendMail } = require("../utils/mailer");
const { inviteEmail, followupInviteEmail } = require("../utils/emailTemplates");
const { containsProfanity } = require("../utils/profanity");

const FOLLOWUP_LIMIT = 3;
const inviteSubjects = [
  "You have a new anonymous invite",
  "New anonymous invite received",
  "A new invite is waiting",
  "Someone sent you an invite",
  "You’ve got a new invite",
  "A new message is waiting",
  "New message: open now",
  "You have a new message",
  "New anonymous message",
  "A message arrived for you",
  "You just got an invite",
  "A new note is waiting",
  "You received an anonymous note",
  "You have a private note",
  "New private message",
  "A new note for you",
  "A new message inside",
  "New invite: open to view",
  "New anonymous invite inside",
  "A fresh invite is here",
  "You have 1 new invite",
  "New invite for you",
  "Someone wrote to you",
  "You’ve got a new note",
  "New message waiting",
  "A new note just arrived",
  "Anonymous invite waiting",
  "New invite alert",
  "You have a new anonymous note",
  "New invite: read now",
  "A new message from someone",
  "Someone reached out",
  "You have a new invite waiting",
  "New invite received today",
  "A new anonymous invite just arrived",
  "New message: see details",
  "Invite received",
  "You received a new invite",
  "A new note is here",
  "New anonymous invite for you",
  "You’ve received a new message",
  "New invite: don’t miss it",
  "You have a new note waiting",
  "Someone sent a note",
  "New invite: open it",
  "A new anonymous message is waiting",
  "New invite: view now",
  "You’ve got a new message",
  "A new invite is ready",
  "New anonymous invite waiting"
];
const followupSubjects = [
  "A follow-up message is waiting",
  "New follow-up message",
  "You have a follow-up message",
  "Follow-up note received",
  "A new follow-up just arrived",
  "Follow-up message inside",
  "New anonymous follow-up",
  "Another message is waiting",
  "A new follow-up is here",
  "Follow-up: open to read",
  "New follow-up message waiting",
  "You’ve received a follow-up",
  "Follow-up received",
  "A follow-up note for you",
  "New follow-up: view now",
  "Another message arrived",
  "Follow-up message: open now",
  "You have a new follow-up",
  "A follow-up just landed",
  "New follow-up note",
  "New follow-up alert",
  "Another anonymous follow-up",
  "Follow-up message received",
  "A fresh follow-up is here",
  "New follow-up: see details",
  "You got a follow-up",
  "A follow-up message arrived",
  "Another follow-up message",
  "Follow-up: read now",
  "New follow-up waiting",
  "A new follow-up is ready",
  "Follow-up note inside",
  "You’ve got a follow-up",
  "Follow-up: open it",
  "New follow-up for you",
  "Another message from them",
  "Follow-up: new message",
  "You have 1 new follow-up",
  "A new follow-up message arrived",
  "Follow-up: don’t miss it",
  "New follow-up: open now",
  "Another note is waiting",
  "Follow-up message for you",
  "New follow-up: read now",
  "You received a follow-up",
  "Follow-up: view now",
  "A follow-up note just arrived",
  "New follow-up message received",
  "A follow-up is waiting",
  "Another follow-up is here"
];
const pickSubject = (subjects, recipientName) => {
  const base = subjects[Math.floor(Math.random() * subjects.length)];
  return recipientName ? `${base}, ${recipientName}` : base;
};

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
    if ([whyYou, greenFlag, passion, trait, message].some(containsProfanity)) {
      return res.status(400).render("error", {
        title: "Inappropriate language",
        message: "Please remove inappropriate words before submitting."
      });
    }
    const cooldownByStatus = {
      rejected: 24 * 60 * 60 * 1000,
      maybe: 4 * 60 * 60 * 1000
    };
    const latestInvite = await Invite.findOne({
      sender: req.user._id,
      recipient: student._id
    }).sort({ createdAt: -1 });
    const cooldownMs = latestInvite ? cooldownByStatus[latestInvite.status] || 0 : 0;
    if (latestInvite && cooldownMs && Date.now() - latestInvite.createdAt.getTime() < cooldownMs) {
      const waitText =
        latestInvite.status === "maybe"
          ? "Please wait at least 4 hours before sending another request."
          : "Please wait at least 1 day before sending another request.";
      return res.status(429).render("error", {
        title: "Slow down",
        message: `You already sent a request to this person recently. ${waitText}`
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
      subject: pickSubject(inviteSubjects, student.name),
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
    if ([whyYou, greenFlag, passion, trait, message].some(containsProfanity)) {
      return res.status(400).render("error", {
        title: "Inappropriate language",
        message: "Please remove inappropriate words before submitting."
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

router.get("/:id/followup", ensureAuth, async (req, res, next) => {
  try {
    const invite = await Invite.findById(req.params.id).populate("recipient");
    if (!invite || invite.sender.toString() !== req.user._id.toString()) {
      return res.redirect("/dashboard");
    }
    const canFollowup =
      invite.response?.contactMethod === "followup" ||
      invite.followups?.some((entry) => entry.response?.allowFollowup);
    if (!canFollowup) {
      return res.redirect(`/invites/${invite._id}`);
    }
    invite.followups = invite.followups || [];
    const followupCount = invite.followups.length;
    const pendingFollowup = invite.followups.find((entry) => !entry.response?.createdAt);
    if (!pendingFollowup && followupCount >= FOLLOWUP_LIMIT) {
      return res.status(400).render("error", {
        title: "Limit reached",
        message:
          "This invite has reached the maximum of 3 anonymous follow-up requests."
      });
    }
    return res.render("send-followup", {
      invite,
      followup: pendingFollowup || null,
      isEdit: Boolean(pendingFollowup),
      followupCount,
      followupLimit: FOLLOWUP_LIMIT
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/followup", ensureAuth, async (req, res, next) => {
  try {
    const invite = await Invite.findById(req.params.id).populate("recipient");
    if (!invite || invite.sender.toString() !== req.user._id.toString()) {
      return res.redirect("/dashboard");
    }
    const canFollowup =
      invite.response?.contactMethod === "followup" ||
      invite.followups?.some((entry) => entry.response?.allowFollowup);
    if (!canFollowup) {
      return res.redirect(`/invites/${invite._id}`);
    }
    invite.followups = invite.followups || [];
    const followupCount = invite.followups.length;
    const pendingFollowup = invite.followups.find((entry) => !entry.response?.createdAt);
    const message = (req.body.message || "").trim().slice(0, 1500);
    if (!message) {
      return res.status(400).render("error", {
        title: "Missing message",
        message: "Please write a message before sending."
      });
    }
    if (containsProfanity(message)) {
      return res.status(400).render("error", {
        title: "Inappropriate language",
        message: "Please remove inappropriate words before submitting."
      });
    }
    if (pendingFollowup) {
      pendingFollowup.message = message;
      await invite.save();
      return res.redirect(303, `/invites/${invite._id}`);
    }
    if (followupCount >= FOLLOWUP_LIMIT) {
      return res.status(400).render("error", {
        title: "Limit reached",
        message:
          "This invite has reached the maximum of 3 anonymous follow-up requests."
      });
    }
    invite.followups.push({ message });
    await invite.save();

    const followup = invite.followups[invite.followups.length - 1];
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const followupLink = `${baseUrl}/i/${invite.secretToken}/followup/${followup._id}`;
    const recipientEmail = invite.recipient.getContactEmail();
    if (recipientEmail) {
      const mailContent = followupInviteEmail({
        inviteLink: followupLink,
        recipientName: invite.recipient.name
      });
      await sendMail({
        to: recipientEmail,
        subject: pickSubject(followupSubjects, invite.recipient.name),
        text: mailContent.text,
        html: mailContent.html
      });
    }

    return res.redirect(303, `/invites/${invite._id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

