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
      $or: [{ name: regex }, { rollNumber: regex }]
    })
      .limit(10)
      .select("name rollNumber email");
    return res.json(students);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

