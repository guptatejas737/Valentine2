require("dotenv").config();

const mongoose = require("mongoose");
const { connectMongo } = require("../lib/mongo");
const Invite = require("../models/Invite");
require("../models/Student");
require("../models/User");
const { sendMail } = require("../utils/mailer");
const {
  inviteEmail,
  followupInviteEmail,
  followupResponseEmail
} = require("../utils/emailTemplates");

const DEFAULT_MINUTES = 90;

const parseArgs = () => {
  const args = process.argv.slice(2);
  let minutes = DEFAULT_MINUTES;
  let dryRun = false;
  let includeFollowups = true;
  let includeFollowupResponses = true;

  args.forEach((arg) => {
    if (arg.startsWith("--minutes=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isNaN(value) && value > 0) {
        minutes = value;
      }
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--no-followups") {
      includeFollowups = false;
    } else if (arg === "--no-followup-responses") {
      includeFollowupResponses = false;
    }
  });

  return { minutes, dryRun, includeFollowups, includeFollowupResponses };
};

const getBaseUrl = () =>
  process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

const logSummary = (stats) => {
  console.log("Resend summary:");
  console.log(`- Invites sent: ${stats.invitesSent}`);
  console.log(`- Follow-ups sent: ${stats.followupsSent}`);
  console.log(`- Follow-up responses sent: ${stats.followupResponsesSent}`);
  console.log(`- Skipped: ${stats.skipped}`);
  console.log(`- Failures: ${stats.failures}`);
};

const sendEmailSafe = async (payload, stats, dryRun) => {
  if (dryRun) {
    console.log(`[dry-run] ${payload.subject} -> ${payload.to}`);
    return;
  }
  try {
    await sendMail(payload);
  } catch (err) {
    stats.failures += 1;
    console.error("Failed to send mail:", err?.message || err);
  }
};

const run = async () => {
  const { minutes, dryRun, includeFollowups, includeFollowupResponses } =
    parseArgs();
  const since = new Date(Date.now() - minutes * 60 * 1000);
  const baseUrl = getBaseUrl();

  const stats = {
    invitesSent: 0,
    followupsSent: 0,
    followupResponsesSent: 0,
    skipped: 0,
    failures: 0
  };

  await connectMongo();

  const invites = await Invite.find({
    createdAt: { $gte: since },
    status: "pending"
  }).populate("recipient");

  for (const invite of invites) {
    const recipient = invite.recipient;
    const recipientEmail =
      recipient && typeof recipient.getContactEmail === "function"
        ? recipient.getContactEmail()
        : null;
    if (!recipientEmail) {
      stats.skipped += 1;
      continue;
    }
    const inviteLink = `${baseUrl}/i/${invite.secretToken}`;
    const mailContent = inviteEmail({
      inviteLink,
      recipientName: recipient.name
    });
    await sendEmailSafe(
      {
        to: recipientEmail,
        subject: "You have a new anonymous invite",
        text: mailContent.text,
        html: mailContent.html
      },
      stats,
      dryRun
    );
    stats.invitesSent += 1;
  }

  if (includeFollowups) {
    const followupInvites = await Invite.find({
      "followups.createdAt": { $gte: since }
    }).populate("recipient");

    for (const invite of followupInvites) {
      const recipient = invite.recipient;
      const recipientEmail =
        recipient && typeof recipient.getContactEmail === "function"
          ? recipient.getContactEmail()
          : null;
      if (!recipientEmail) {
        stats.skipped += 1;
        continue;
      }
      const followups = Array.isArray(invite.followups) ? invite.followups : [];
      for (const followup of followups) {
        if (!followup.createdAt || followup.createdAt < since) {
          continue;
        }
        if (followup.response?.createdAt) {
          stats.skipped += 1;
          continue;
        }
        const followupLink = `${baseUrl}/i/${invite.secretToken}/followup/${followup._id}`;
        const mailContent = followupInviteEmail({
          inviteLink: followupLink,
          recipientName: recipient.name
        });
        await sendEmailSafe(
          {
            to: recipientEmail,
            subject: "A follow-up message is waiting",
            text: mailContent.text,
            html: mailContent.html
          },
          stats,
          dryRun
        );
        stats.followupsSent += 1;
      }
    }
  }

  if (includeFollowupResponses) {
    const responseInvites = await Invite.find({
      "followups.response.createdAt": { $gte: since }
    })
      .populate("sender")
      .populate("recipient");

    for (const invite of responseInvites) {
      if (!invite.sender?.email) {
        stats.skipped += 1;
        continue;
      }
      const followups = Array.isArray(invite.followups) ? invite.followups : [];
      for (const followup of followups) {
        if (!followup.response?.createdAt || followup.response.createdAt < since) {
          continue;
        }
        const mailContent = followupResponseEmail({
          recipientName: invite.recipient?.name
        });
        await sendEmailSafe(
          {
            to: invite.sender.email,
            subject: "You received a follow-up response",
            text: mailContent.text,
            html: mailContent.html
          },
          stats,
          dryRun
        );
        stats.followupResponsesSent += 1;
      }
    }
  }

  logSummary(stats);
  await mongoose.connection.close();
};

run().catch((err) => {
  console.error("Resend failed:", err);
  mongoose.connection.close().catch(() => undefined);
  process.exitCode = 1;
});

