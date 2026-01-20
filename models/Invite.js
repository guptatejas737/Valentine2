const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    message: { type: String, required: true },
    questions: {
      q1: { type: String },
      q2: { type: String }
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    response: {
      rating: { type: Number },
      comment: { type: String },
      consider: { type: Boolean },
      phone: { type: String },
      insta: { type: String }
    },
    secretToken: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invite", InviteSchema);

