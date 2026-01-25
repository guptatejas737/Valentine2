const express = require("express");
const Invite = require("../models/Invite");
const { sendMail } = require("../utils/mailer");
const { responseEmail, followupResponseEmail } = require("../utils/emailTemplates");

const FOLLOWUP_LIMIT = 3;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderFollowupFallback = (res, invite, followup) => {
  const action = `/i/${invite.secretToken}/followup/${followup._id}`;
  const message = escapeHtml(followup.message || "");
  return res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Follow-up message</title>
        <style>
          body{background:#0a0a0f;color:#f7f3f6;font-family:Inter,Segoe UI,Tahoma,Arial,sans-serif;padding:32px}
          .card{max-width:720px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:24px}
          textarea,input{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.35);color:#fff}
          .btn{display:inline-block;margin-top:16px;padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,#ff0055,#7000ff);color:#fff;text-decoration:none;border:none}
          .muted{color:rgba(255,255,255,0.7);font-size:14px}
          .grid{display:grid;gap:12px}
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Follow-up message</h2>
          <p class="muted">Their follow-up:</p>
          <p>${message}</p>
          <hr style="border:0;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0"/>
          <form method="POST" action="${action}">
            <label>Your response</label>
            <textarea name="message" rows="5" required maxlength="1000"></textarea>
            <p class="muted" style="margin-top:14px;">If you’re comfortable, you can leave one way for them to reach you.</p>
            <div class="grid">
              <label><input type="radio" name="contactMethod" value="phone" /> Phone number</label>
              <label><input type="radio" name="contactMethod" value="insta" /> Instagram handle</label>
              <label><input type="radio" name="contactMethod" value="followup" /> Let them send one more anonymous message</label>
            </div>
            <label style="margin-top:12px;display:block;">Phone number</label>
            <input type="text" name="phone" />
            <label style="margin-top:12px;display:block;">Instagram handle</label>
            <input type="text" name="insta" />
            <button class="btn" type="submit">Send response</button>
          </form>
        </div>
      </body>
    </html>
  `);
};

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
    const followupCount = Array.isArray(invite.followups) ? invite.followups.length : 0;
    const allowMoreFollowups = followupCount < FOLLOWUP_LIMIT;
    return res.render("public-invite", {
      invite,
      followupCount,
      followupLimit: FOLLOWUP_LIMIT,
      allowMoreFollowups
    });
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
    const followupCount = Array.isArray(invite.followups) ? invite.followups.length : 0;
    const allowMoreFollowups = followupCount < FOLLOWUP_LIMIT;

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
    if (isOpen && contactMethod === "followup" && !allowMoreFollowups) {
      return res.status(400).render("error", {
        title: "Limit reached",
        message:
          "This invite has reached the maximum of 3 anonymous follow-up requests."
      });
    }
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

router.get("/i/:token/followup/:followupId", async (req, res, next) => {
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
    const followups = Array.isArray(invite.followups) ? invite.followups : [];
    const followup = followups.find(
      (entry) => entry._id && entry._id.toString() === req.params.followupId
    );
    if (!followup) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "This follow-up message is no longer available."
      });
    }
    const safeFollowup = {
      _id: followup._id,
      message: typeof followup.message === "string" ? followup.message : String(followup.message || "")
    };
    const followupCount = followups.length;
    const allowMoreFollowups = followupCount < FOLLOWUP_LIMIT;
    return res.render(
      "public-followup",
      {
        invite,
        followup: safeFollowup,
        followupCount,
        followupLimit: FOLLOWUP_LIMIT,
        allowMoreFollowups
      },
      (err, html) => {
      if (err) {
        console.error("Failed to render public-followup:", err);
        return renderFollowupFallback(res, invite, safeFollowup);
      }
      return res.send(html);
      }
    );
  } catch (err) {
    next(err);
  }
});

router.post("/i/:token/followup/:followupId", async (req, res, next) => {
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
    const followups = Array.isArray(invite.followups) ? invite.followups : [];
    const followup = followups.find(
      (entry) => entry._id && entry._id.toString() === req.params.followupId
    );
    if (!followup) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "This follow-up message is no longer available."
      });
    }
    if (followup.response?.createdAt) {
      return res.render("response-thanks", { invite });
    }

    const message = (req.body.message || "").trim().slice(0, 1000);
    const contactMethod = (req.body.contactMethod || "").trim();
    const phone = (req.body.phone || "").trim();
    const insta = (req.body.insta || "").trim();
    const allowMoreFollowups = followups.length < FOLLOWUP_LIMIT;

    if (!message) {
      return res.status(400).render("error", {
        title: "Missing response",
        message: "Please write a response before submitting."
      });
    }
    if (contactMethod === "followup" && !allowMoreFollowups) {
      return res.status(400).render("error", {
        title: "Limit reached",
        message:
          "This invite has reached the maximum of 3 anonymous follow-up requests."
      });
    }

    followup.response = {
      message,
      contactMethod,
      phone: contactMethod === "phone" ? phone : "",
      insta: contactMethod === "insta" ? insta : "",
      allowFollowup: contactMethod === "followup",
      createdAt: new Date()
    };
    await invite.save();

    const mailContent = followupResponseEmail({
      recipientName: invite.recipient.name,
      inviteId: invite._id
    });
    await sendMail({
      to: invite.sender.email,
      subject: "Your follow-up received a response",
      text: mailContent.text,
      html: mailContent.html
    });

    return res.render("response-thanks", { invite });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

