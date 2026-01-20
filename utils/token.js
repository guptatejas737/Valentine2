const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = { generateToken };

