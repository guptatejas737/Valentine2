const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    whyYou: { type: String },
    about: {
      greenFlag: { type: String },
      passion: { type: String },
      trait: { type: String }
    },
    message: { type: String, required: true },
    questions: {
      q1: { type: String },
      q2: { type: String }
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "maybe", "rejected"],
      default: "pending"
    },
    response: {
      rating: { type: Number },
      comment: { type: String },
      feeling: { type: String },
      standout: { type: String },
      openness: { type: String },
      phone: { type: String },
      insta: { type: String },
      contactMethod: { type: String },
      allowFollowup: { type: Boolean }
    },
    secretToken: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invite", InviteSchema);

