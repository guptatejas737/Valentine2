const express = require("express");
const Student = require("../models/Student");
const { ensureAuth } = require("../utils/auth");
const { containsProfanity } = require("../utils/profanity");

const router = express.Router();

router.get("/students", ensureAuth, async (req, res, next) => {
  try {
    const query = (req.query.query || "").trim();
    if (!query) {
      return res.json([]);
    }
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapeRegex(query), "i");
    const tokens = query.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    const nameMatch =
      tokens.length > 1
        ? { $and: tokens.map((token) => ({ name: new RegExp(escapeRegex(token), "i") })) }
        : { name: regex };
    const students = await Student.find({
      $or: [nameMatch, { rollNumber: regex }, { email: regex }]
    })
      .limit(10)
      .select("name rollNumber email");
    return res.json(students);
  } catch (err) {
    next(err);
  }
});

router.post("/students/manual", ensureAuth, async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    const rollNumber = (req.body.rollNumber || "").trim().toLowerCase();
    if (!name || !rollNumber) {
      return res.status(400).json({ error: "Name and roll number are required." });
    }
    if ([name, rollNumber].some(containsProfanity)) {
      return res.status(400).json({ error: "Please remove inappropriate words." });
    }
    const existing = await Student.findOne({ rollNumber });
    if (existing) {
      if (existing.name !== name) {
        existing.name = name;
        await existing.save();
      }
      return res.json(existing);
    }
    const created = await Student.create({ name, rollNumber });
    return res.json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

