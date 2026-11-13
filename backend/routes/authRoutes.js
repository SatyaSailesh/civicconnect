const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter(_req, file, cb) {
  cb(["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ? null : Object.assign(new Error("Use JPEG, PNG or WebP images."), { status: 400 }), true);
} });
const { rateLimit } = require('express-rate-limit');
const createAuthLimiter = (limit, windowMs = 15 * 60 * 1000) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait before trying again.' },
});
const registrationLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const loginLimiter = createAuthLimiter(10);
const verificationLimiter = createAuthLimiter(5, 60 * 60 * 1000);
const passwordChangeLimiter = createAuthLimiter(5);

// ── Helpers ───────────────────────────────────────────────────────────────────
const getWhitelist = () => {
  const map = Object.create(null);
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
router.post("/register", registrationLimiter, async (req, res) => {
  try {
    const { name, email: rawEmail, password, role, adminSecretCode } = req.body;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (typeof name !== "string" || !name.trim() || !email || typeof password !== "string" || !password)
      return res.status(400).json({ message: "Name, email and password are required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "An account with this email already exists" });

    // ── Admin security checks ─────────────────────────────────────────────────
    if (role === "admin") {
      // Layer 1: Email must be in admin whitelist
      const adminWhitelist = getAdminWhitelist();
      if (!adminWhitelist.includes(email)) {
        return res.status(403).json({
          message: "This email is not authorised for an official account. Contact your system administrator."
        });
      }

      // Layer 2: Must provide correct secret code
      const correctCode = process.env.ADMIN_SECRET_CODE;
      if (typeof adminSecretCode !== "string" || !adminSecretCode.trim()) {
        return res.status(403).json({ message: "Official accounts require an authority verification code." });
      }
      if (!correctCode || adminSecretCode.trim() !== correctCode) {
        return res.status(403).json({ message: "Invalid authority verification code. Access denied." });
      }
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // ── Layer 3: Admin accounts start as pending approval ────────────────────
    const isApproved = role !== "admin"; // citizens auto-approved, admins need approval

    const user = new User({
      name: name.trim(),
      email,
      password: hashed,
      role: role === "admin" ? "admin" : "citizen",
      isApproved,
    });
    await user.save();

    // ── Layer 4: Admin pending approval — don't issue token yet ──────────────
    if (role === "admin" && !isApproved) {
      return res.status(201).json({
        message: "Official account created. Your account is pending approval by the system administrator. You can sign in after approval.",
        pendingApproval: true,
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
        emailNotifications: user.emailNotifications,
        mapTheme: user.mapTheme,
        followedComplaints: user.followedComplaints,
        selectedArea: user.selectedArea,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "An account with this email already exists" });
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
// For admins: requires adminSecretCode as second factor
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, role: claimedRole, adminSecretCode } = req.body;

    if (typeof email !== "string" || typeof password !== "string")
      return res.status(400).json({ message: "Invalid email or password" });
    const user = await User.findOne({ email: email.trim().toLowerCase() });
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
      if (typeof adminSecretCode !== "string" || !correctCode || adminSecretCode.trim() !== correctCode) {
        return res.status(403).json({ message: "Invalid authority verification code. Access denied." });
      }

      if (!user.isApproved) {
        return res.status(403).json({ message: "Your official account is pending approval." });
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
        emailNotifications: user.emailNotifications,
        mapTheme: user.mapTheme,
        followedComplaints: user.followedComplaints,
        selectedArea: user.selectedArea,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
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
router.put("/preferences", auth, async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.emailNotifications !== undefined && typeof req.body.emailNotifications !== "boolean")
      return res.status(400).json({ message: "emailNotifications must be true or false" });
    if (req.body.mapTheme !== undefined && !['light', 'dark'].includes(req.body.mapTheme))
      return res.status(400).json({ message: "mapTheme must be light or dark" });
    if (req.body.emailNotifications !== undefined) updates.emailNotifications = req.body.emailNotifications;
    if (req.body.mapTheme !== undefined) updates.mapTheme = req.body.mapTheme;
    if (req.body.selectedArea !== undefined) {
      const area = req.body.selectedArea;
      if (area !== null && (!area || typeof area.city !== "string" || !area.city.trim() || typeof area.state !== "string" || !area.state.trim() || area.city.length > 100 || area.state.length > 100))
        return res.status(400).json({ message: "selectedArea must contain a city and state or be null" });
      updates.selectedArea = area === null ? { city: "", state: "" } : { city: area.city.trim(), state: area.state.trim() };
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Supply a supported preference" });
    const user = await User.findByIdAndUpdate(req.user.id,
      updates, { new: true, runValidators: true }).select("-password");
    res.json({ message: "Preferences saved", user });
  } catch (error) { next(error); }
});

router.put("/avatar", auth, avatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose an image to upload." });
    if (!["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every(name => process.env[name]?.trim()))
      return res.status(503).json({ message: "Profile photo uploads are unavailable until image storage is configured." });
    const uploaded = await new Promise((resolve, reject) => cloudinary.uploader.upload_stream({ folder: "civicconnect/avatars", resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp"], transformation: [{ width: 512, height: 512, crop: "fill", quality: "auto" }] }, (error, result) => error ? reject(error) : resolve(result)).end(req.file.buffer));
    const user = await User.findById(req.user.id);
    const oldId = user.avatarPublicId;
    user.avatarUrl = uploaded.secure_url;
    user.avatarPublicId = uploaded.public_id;
    await user.save();
    if (oldId) cloudinary.uploader.destroy(oldId).catch(() => {});
    res.json({ message: "Profile photo saved", user: await User.findById(user.id).select("-password") });
  } catch (error) { next(error); }
});

router.delete("/avatar", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const oldId = user.avatarPublicId;
    user.avatarUrl = ""; user.avatarPublicId = "";
    await user.save();
    if (oldId) cloudinary.uploader.destroy(oldId).catch(() => {});
    res.json({ message: "Profile photo removed", user: await User.findById(user.id).select("-password") });
  } catch (error) { next(error); }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
      return res.status(400).json({ message: "Name must contain 1 to 100 characters" });
    const user = await User.findByIdAndUpdate(
      req.user.id, { name: name.trim() }, { new: true }
    ).select("-password");
    res.json({ message: "Name updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /change-password ──────────────────────────────────────────────────────
router.put("/change-password", auth, passwordChangeLimiter, async (req, res) => {
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
router.post("/verify-aadhaar", auth, verificationLimiter, async (req, res) => {
  if (req.user.role !== "citizen")
    return res.status(403).json({ message: "Only citizen accounts can use demo verification." });
  try {
    const { aadhaarNumber } = req.body;
    if (typeof aadhaarNumber !== "string" || !/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, "")))
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

// ── POST /admin/approve/:id — Approve a pending admin account ─────────────────
router.post("/admin/approve/:id", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Only admins can approve accounts" });
  try {
    const target = await User.findById(req.params.id).select("-password");
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
