const express = require("express");
const Student = require("../models/Student");
const { ensureAuth } = require("../utils/auth");

const router = express.Router();

router.get("/students", ensureAuth, async (req, res, next) => {
  try {
    const query = (req.query.query || "").trim();
    if (!query) {
      return res.json([]);
    }
    const regex = new RegExp(query, "i");
    const students = await Student.find({
      $or: [{ name: regex }, { rollNumber: regex }, { email: regex }]
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
    const email = (req.body.email || "").trim().toLowerCase();
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required." });
    }
    const existing = await Student.findOne({ email });
    if (existing) {
      return res.json(existing);
    }
    const created = await Student.create({ name, email });
    return res.json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

