const express = require("express");
const Invite = require("../models/Invite");
const { sendMail } = require("../utils/mailer");
const { responseEmail } = require("../utils/emailTemplates");

const router = express.Router();

router.get("/i/:token", async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ secretToken: req.params.token })
      .populate("sender")
      .populate("recipient");
    if (!invite) {
      return res.status(404).render("error", {
        title: "Invalid link",
        message: "This invite link is invalid or expired."
      });
    }
    return res.render("public-invite", { invite });
  } catch (err) {
    next(err);
  }
});

router.post("/i/:token", async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ secretToken: req.params.token })
      .populate("sender")
      .populate("recipient");
    if (!invite) {
      return res.status(404).render("error", {
        title: "Invalid link",
        message: "This invite link is invalid or expired."
      });
    }
    if (invite.status !== "pending") {
      return res.render("public-invite", { invite });
    }

    const feeling = (req.body.feeling || "").trim();
    const standout = (req.body.standout || "").trim();
    const openness = (req.body.openness || "").trim();
    const contactMethod = (req.body.contactMethod || "").trim();
    const phone = (req.body.phone || "").trim();
    const insta = (req.body.insta || "").trim();
    const allowFollowup = Boolean(req.body.allowFollowup);

    if (!feeling || !standout || !["yes", "maybe", "no"].includes(openness)) {
      return res.status(400).render("error", {
        title: "Missing response",
        message: "Please answer each question before submitting."
      });
    }

    invite.response.feeling = feeling;
    invite.response.standout = standout;
    invite.response.openness = openness;
    const isOpen = openness === "yes";
    invite.response.contactMethod = isOpen ? contactMethod : "";
    invite.response.phone = isOpen && contactMethod === "phone" ? phone : "";
    invite.response.insta = isOpen && contactMethod === "insta" ? insta : "";
    invite.response.allowFollowup = isOpen && contactMethod === "followup";

    if (openness === "yes") {
      invite.status = "accepted";
    } else if (openness === "maybe") {
      invite.status = "maybe";
    } else {
      invite.status = "rejected";
    }
    await invite.save();

    const mailContent = responseEmail({
      recipientName: invite.recipient.name,
      status: invite.status
    });
    await sendMail({
      to: invite.sender.email,
      subject: "Your prom invite has a response!",
      text: mailContent.text,
      html: mailContent.html
    });

    return res.render("response-thanks", { invite });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

