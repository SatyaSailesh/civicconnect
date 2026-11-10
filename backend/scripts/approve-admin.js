require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !process.env.MONGO_URI) {
    throw new Error("Set MONGO_URI and run npm run approve-admin -- <registered-admin-email>");
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email, role: "admin" },
    { isApproved: true }
  );
  if (!user) throw new Error("Register this account as an official before approving it.");
  console.log("Official account approved.");
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
