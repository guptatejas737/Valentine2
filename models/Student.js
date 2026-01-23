const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rollNumber: { type: String },
    email: { type: String }
  },
  { timestamps: true }
);

StudentSchema.index(
  { rollNumber: 1 },
  { unique: true, partialFilterExpression: { rollNumber: { $type: "string" } } }
);
StudentSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

StudentSchema.methods.getContactEmail = function getContactEmail() {
  if (this.email) {
    return this.email;
  }
  if (this.rollNumber) {
    return `${this.rollNumber}@smail.iitm.ac.in`;
  }
  return null;
};

module.exports = mongoose.model("Student", StudentSchema);

