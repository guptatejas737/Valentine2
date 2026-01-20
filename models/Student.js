const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);

