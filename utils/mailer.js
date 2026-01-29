const nodemailer = require("nodemailer");

let cachedTransport = null;

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
    },
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    rateDelta: 1000,
    rateLimit: 5
  });
}

function getTransport() {
  if (!cachedTransport) {
    cachedTransport = createTransport();
  }
  return cachedTransport;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendMail({ to, subject, html, text }) {
  const transport = getTransport();
  if (!transport) {
    console.warn("SMTP not configured. Skipping email:", subject, to);
    return;
  }

  const payload = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  };

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      await transport.sendMail(payload);
      return;
    } catch (err) {
      if (attempt >= maxRetries) {
        throw err;
      }
      if (cachedTransport && typeof cachedTransport.close === "function") {
        cachedTransport.close();
      }
      cachedTransport = null;
      await delay(1000 * (attempt + 1));
    }
  }
}

module.exports = { sendMail };

