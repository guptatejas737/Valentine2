const normalizeBaseUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+$/, "");
};

const getBaseUrl = () =>
  normalizeBaseUrl(process.env.APP_BASE_URL) ||
  `http://localhost:${process.env.PORT || 3000}`;

const wrapEmail = ({ title, subtitle, bodyHtml }) => {
  const accent = "#ff0055";
  const accent2 = "#7000ff";
  return `
  <div style="background:#050505;padding:32px 16px;font-family:Inter,Segoe UI,Tahoma,Arial,sans-serif;color:#f7f3f6;">
    <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;">
      <div style="padding:24px 28px;background:linear-gradient(135deg,rgba(255,0,85,0.25),rgba(112,0,255,0.25));border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:12px;letter-spacing:0.35em;text-transform:uppercase;color:#cdd1d8;">Valentine Prom</div>
        <div style="margin-top:10px;font-size:22px;font-weight:700;">${title}</div>
        ${subtitle ? `<div style="margin-top:6px;color:#c7cad1;font-size:14px;">${subtitle}</div>` : ""}
      </div>
      <div style="padding:24px 28px;font-size:15px;line-height:1.6;color:#f0e9ee;">
        ${bodyHtml}
        <div style="margin-top:24px;color:#c7cad1;font-size:12px;">
          Sent with love from the Valentine Prom team.
        </div>
      </div>
      <div style="padding:16px 28px;background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
        <a href="${getBaseUrl()}" style="color:${accent};text-decoration:none;font-weight:600;">Visit your dashboard</a>
      </div>
    </div>
  </div>
  `;
};

const inviteEmail = ({ inviteLink, recipientName }) => {
  const html = wrapEmail({
    title: "You've got a secret invite",
    subtitle: recipientName ? `For ${recipientName}` : undefined,
    bodyHtml: `
      <p>Someone has sent you an anonymous confession. Your secret invite is waiting.</p>
      <p style="margin:20px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:linear-gradient(135deg,#ff0055,#7000ff);color:#fff;text-decoration:none;font-weight:600;">Open your invite</a>
      </p>
      <p style="color:#c7cad1;font-size:13px;">If the button doesn’t work, copy this link:</p>
      <p style="word-break:break-all;font-size:13px;color:#f5c2d6;">${inviteLink}</p>
    `
  });
  const text = `Someone sent you an anonymous confession. Open it here: ${inviteLink}`;
  return { html, text };
};

const responseEmail = ({ recipientName, status }) => {
  const statusText =
    status === "accepted"
      ? "accepted"
      : status === "maybe"
        ? "is open to talking"
        : "responded to";
  const subtitle =
    recipientName && status === "maybe"
      ? `${recipientName} is open to talking.`
      : recipientName
        ? `${recipientName} has ${statusText} your invite.`
        : undefined;
  const html = wrapEmail({
    title: "Your invite has a response",
    subtitle,
    bodyHtml: `
      <p>Your anonymous confession received a response.</p>
      <p style="margin-top:12px;">Status: <strong style="color:${
        status === "accepted" ? "#34d399" : status === "maybe" ? "#f2c94c" : "#ff5a6e"
      };">${status}</strong></p>
      <p style="margin-top:16px;">Log in to view the details on your dashboard.</p>
    `
  });
  const text = `Your invite to ${recipientName || "your match"} has been ${status}.`;
  return { html, text };
};

module.exports = { inviteEmail, responseEmail };

