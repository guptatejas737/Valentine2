const nodemailer = require("nodemailer");

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBaseEmail({ title, preheader, bodyHtml, ctaLabel, ctaLink, footer }) {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const safeFooter = escapeHtml(footer);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaLink = escapeHtml(ctaLink);

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0;padding:0;background:#0a050b;color:#f8eaf1;font-family:Segoe UI,Arial,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a050b;padding:32px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#140a18;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
              <tr>
                <td style="padding:28px 32px;background:linear-gradient(120deg,#ff3b6b,#b3003c);color:#fff;">
                  <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;">Valentine Prom</div>
                  <h1 style="margin:8px 0 0;font-size:26px;">${safeTitle}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;font-size:15px;line-height:1.6;color:#f8eaf1;">
                  ${bodyHtml}
                  ${
                    ctaLabel && ctaLink
                      ? `<div style="margin:24px 0 10px;">
                          <a href="${safeCtaLink}" style="background:#ff3b6b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:600;">${safeCtaLabel}</a>
                        </div>`
                      : ""
                  }
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px;background:#100712;color:#cbb6bf;font-size:12px;">
                  ${safeFooter}
                </td>
              </tr>
            </table>
            <div style="font-size:11px;color:#7c6671;margin-top:14px;">
              You received this because you were tagged in Valentine Prom.
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const text = `${title}\n\n${preheader}\n\n${bodyHtml
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()}\n\n${ctaLabel && ctaLink ? `${ctaLabel}: ${ctaLink}\n\n` : ""}${footer}`;

  return { html, text };
}

function buildInviteEmail({ recipientName, inviteLink }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">Hey ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 14px;">
      Someone sent you a <strong>secret prom invite</strong> and chose to stay anonymous.
      The message is waiting for you — open it when you're ready.
    </p>
    <div style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0;">This link is unique to you. Please keep it private.</p>
    </div>
  `;

  return buildBaseEmail({
    title: "You have a secret prom invite",
    preheader: "An anonymous invite is waiting for you. Open the link to view it.",
    bodyHtml,
    ctaLabel: "Open your invite",
    ctaLink: inviteLink,
    footer: "No login required to view this invite."
  });
}

function buildResponseEmail({ recipientName, status, inviteLink }) {
  const prettyStatus = status === "accepted" ? "accepted" : "declined";
  const bodyHtml = `
    <p style="margin:0 0 14px;">Your invite to <strong>${escapeHtml(
      recipientName
    )}</strong> has been <strong>${escapeHtml(prettyStatus)}</strong>.</p>
    <p style="margin:0 0 14px;">You can see the full response and next steps inside your dashboard.</p>
  `;

  return buildBaseEmail({
    title: "Your invite has a response",
    preheader: `Your invite has been ${prettyStatus}. See details now.`,
    bodyHtml,
    ctaLabel: "View invite details",
    ctaLink: inviteLink,
    footer: "Thanks for keeping it kind and respectful."
  });
}

async function sendMail({ to, subject, html, text }) {
  const transport = createTransport();
  if (!transport) {
    console.warn("SMTP not configured. Skipping email:", subject, to);
    return;
  }
  if (!to) {
    console.warn("No recipient defined. Skipping email:", subject);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail, buildInviteEmail, buildResponseEmail };

