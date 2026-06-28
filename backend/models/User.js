const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["citizen", "admin"], default: "citizen" },
  aadhaarVerified: { type: Boolean, default: false },

  // Layer 3: Admin accounts start as false until a super-admin approves them
  isApproved: { type: Boolean, default: true }, // citizens are auto-approved
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);