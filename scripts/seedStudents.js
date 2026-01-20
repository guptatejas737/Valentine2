require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("../models/Student");

const students = [
  { name: "Aarav Mehta", rollNumber: "CS101", email: "me24b173@smail.iitm.ac.in" },
  { name: "Isha Kapoor", rollNumber: "CS102", email: "isha@college.edu" }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Student.deleteMany({});
    await Student.insertMany(students);
    console.log("Seeded students:", students.length);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();

