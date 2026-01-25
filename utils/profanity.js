const patterns = [
  "boob(?:s|ies)?",
  "sex(?:y|ual|s|ed|ing)?",
  "sext(?:s|ed|ing)?",
  "fuck(?:er|ers|ed|ing|s)?",
  "shit(?:ty|ted|ting|s)?",
  "bitch(?:es|y|ing)?",
  "slut(?:s)?",
  "whore(?:s)?",
  "dick(?:s)?",
  "penis(?:es)?",
  "vagina(?:s|e)?",
  "pussy(?:s)?",
  "cock(?:s)?",
  "tits?",
  "asshole(?:s)?",
  "cum(?:s|ming)?",
  "horny"
];

const profanityRegex = new RegExp(`\\b(?:${patterns.join("|")})\\b`, "i");

const containsProfanity = (value) => profanityRegex.test(String(value || ""));

module.exports = { containsProfanity };

