const express = require("express");
const Invite = require("../models/Invite");
const { sendMail, buildResponseEmail } = require("../utils/mailer");

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

    const { rating, comment, consider, phone, insta } = req.body;
    invite.response.rating = Number(rating);
    invite.response.comment = comment;
    invite.response.consider = consider === "yes";
    invite.response.phone = consider === "yes" ? phone : "";
    invite.response.insta = consider === "yes" ? insta : "";
    invite.status = invite.response.consider ? "accepted" : "rejected";
    await invite.save();

    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const inviteDetailsLink = `${baseUrl}/invites/${invite._id}`;
    const responseEmail = buildResponseEmail({
      recipientName: invite.recipient.name,
      status: invite.status,
      inviteLink: inviteDetailsLink
    });
    await sendMail({
      to: invite.sender.email,
      subject: "Your invite has a response",
      text: responseEmail.text,
      html: responseEmail.html
    });

    return res.render("response-thanks", { invite });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

