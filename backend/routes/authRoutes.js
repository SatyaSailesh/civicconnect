const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

// ── Helpers ───────────────────────────────────────────────────────────────────
const getWhitelist = () => {
  const map = {};
  (process.env.AADHAAR_WHITELIST || "").split(",").forEach(entry => {
    const [e, a] = entry.split(":");
    if (e && a) map[e.trim().toLowerCase()] = a.trim();
  });
  return map;
};

const getAdminWhitelist = () =>
  (process.env.ADMIN_WHITELIST || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

// ── POST /register ────────────────────────────────────────────────────────────
// Security layers for admin:
//   1. Email must be in ADMIN_WHITELIST
//   2. Must provide correct ADMIN_SECRET_CODE
//   3. Account is created with isApproved=false — admin must approve manually
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, adminSecretCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: "Name, email and password are required" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "An account with this email already exists" });

    // ── Admin security checks ─────────────────────────────────────────────────
    if (role === "admin") {
      // Layer 1: Email must be in admin whitelist
      const adminWhitelist = getAdminWhitelist();
      if (adminWhitelist.length > 0 && !adminWhitelist.includes(email.toLowerCase())) {
        return res.status(403).json({
          message: "This email is not authorised for an official account. Contact your system administrator."
        });
      }

      // Layer 2: Must provide correct secret code
      const correctCode = process.env.ADMIN_SECRET_CODE;
      if (!adminSecretCode?.trim()) {
        return res.status(403).json({ message: "Official accounts require an authority verification code." });
      }
      if (adminSecretCode.trim() !== correctCode) {
        return res.status(403).json({ message: "Invalid authority verification code. Access denied." });
      }
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // ── Auto-verify Aadhaar if whitelisted ───────────────────────────────────
    const aadhaarMap = getWhitelist();
    const aadhaarVerified = !!aadhaarMap[email.toLowerCase()];

    // ── Layer 3: Admin accounts start as pending approval ────────────────────
    const isApproved = role !== "admin"; // citizens auto-approved, admins need approval

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: role === "admin" ? "admin" : "citizen",
      aadhaarVerified,
      isApproved,
    });
    await user.save();

    // ── Layer 4: Admin pending approval — don't issue token yet ──────────────
    if (role === "admin" && !isApproved) {
      return res.status(201).json({
        message: "Official account created. Your account is pending approval by the system administrator. You will be notified once approved.",
        pendingApproval: true,
      });
    }
    // First admin — auto-approved, issue token immediately
    if (role === "admin" && isApproved) {
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, aadhaarVerified: user.aadhaarVerified, isApproved: true },
      });
    }

    // Citizen — issue token and auto-login
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        aadhaarVerified: user.aadhaarVerified,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
// For admins: requires adminSecretCode as second factor
router.post("/login", async (req, res) => {
  try {
    const { email, password, role: claimedRole, adminSecretCode } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // ── Admin login additional checks ────────────────────────────────────────
    if (user.role === "admin") {
      // Must explicitly claim admin role
      if (claimedRole !== "admin") {
        return res.status(403).json({
          message: "This account requires official login. Please select 'Government Official' and enter your verification code."
        });
      }

      // Must provide correct secret code (second factor)
      const correctCode = process.env.ADMIN_SECRET_CODE;
      if (!adminSecretCode?.trim() || adminSecretCode.trim() !== correctCode) {
        return res.status(403).json({ message: "Invalid authority verification code. Access denied." });
      }

      // Auto-approve existing admins (legacy accounts created before approval system)
      if (!user.isApproved) {
        user.isApproved = true;
        await user.save();
      }
    }

    // ── Citizen claiming admin role — block immediately ──────────────────────
    if (claimedRole === "admin" && user.role !== "admin") {
      return res.status(403).json({ message: "You are not registered as a government official." });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        aadhaarVerified: user.aadhaarVerified,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /profile ──────────────────────────────────────────────────────────────
router.put("/profile", auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const user = await User.findByIdAndUpdate(
      req.user.id, { name: name.trim() }, { new: true }
    ).select("-password");
    res.json({ message: "Name updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /change-password ──────────────────────────────────────────────────────
router.put("/change-password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Both old and new password are required" });
    if (newPassword.length < 8)
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /verify-aadhaar ──────────────────────────────────────────────────────
router.post("/verify-aadhaar", auth, async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber || aadhaarNumber.replace(/\s/g, "").length !== 12)
      return res.status(400).json({ message: "Please enter a valid 12-digit Aadhaar number" });

    const user = await User.findById(req.user.id);
    const map = getWhitelist();
    const cleaned = aadhaarNumber.replace(/\s/g, "");
    const valid = map[user.email.toLowerCase()] === cleaned;

    if (!valid) return res.status(400).json({ message: "Aadhaar number does not match our records" });
    user.aadhaarVerified = true;
    await user.save();
    res.json({ message: "Aadhaar verified successfully", user: { aadhaarVerified: true } });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /admin/self-approve — One-time: approve yourself if you're the only admin ──
router.post("/admin/self-approve", async (req, res) => {
  try {
    const { email, adminSecretCode } = req.body;
    if (adminSecretCode !== process.env.ADMIN_SECRET_CODE)
      return res.status(403).json({ message: "Invalid code" });
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase(), role: "admin" },
      { isApproved: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "Admin user not found" });
    res.json({ message: `${user.name} approved successfully. You can now log in.` });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /admin/approve/:id — Approve a pending admin account ─────────────────
router.post("/admin/approve/:id", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Only admins can approve accounts" });
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role !== "admin")
      return res.status(400).json({ message: "Only admin accounts need approval" });
    target.isApproved = true;
    await target.save();
    res.json({ message: `${target.name}'s account has been approved`, user: target });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /admin/users — All users ──────────────────────────────────────────────
router.get("/admin/users", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admins only" });
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /stats — Public live stats for landing page ──────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const Complaint = require("../models/Complaint");
    const [citizens, officials, resolved, total] = await Promise.all([
      User.countDocuments({ role: "citizen" }),
      User.countDocuments({ role: "admin", isApproved: true }),
      Complaint.countDocuments({ status: "Resolved" }),
      Complaint.countDocuments(),
    ]);
    res.json({ citizens, officials, resolved, total });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;