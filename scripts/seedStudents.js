require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Student = require("../models/Student");

const filePath = path.join(__dirname, "..", "student-list.csv");

function parseStudents(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const commaIndex = line.indexOf(",");
      if (commaIndex === -1) return null;
      const rollNumber = line.slice(0, commaIndex).trim();
      const name = line.slice(commaIndex + 1).trim();
      if (!rollNumber || !name) return null;
      return { rollNumber, name };
    })
    .filter(Boolean);
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    try {
      await Student.collection.dropIndex("email_1");
    } catch (err) {
      if (err.codeName !== "IndexNotFound") {
        console.warn("Failed to drop email_1 index:", err.message);
      }
    }
    await Student.syncIndexes();
    const csvText = fs.readFileSync(filePath, "utf8");
    const students = parseStudents(csvText);
    if (!students.length) {
      console.log("No students found in CSV.");
      return;
    }
    const bulkOps = students.map((student) => ({
      updateOne: {
        filter: { rollNumber: student.rollNumber },
        update: { $set: student },
        upsert: true
      }
    }));
    const result = await Student.bulkWrite(bulkOps);
    console.log("Seeded/updated students:", students.length);
    console.log("Upserts:", result.upsertedCount, "Modified:", result.modifiedCount);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();

