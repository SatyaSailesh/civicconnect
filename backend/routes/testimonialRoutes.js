const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { Testimonial } = require("../models/Complaint");
const User = require("../models/User");

// GET /api/testimonials — public, only approved ones
router.get("/", async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ approved: true })
            .sort({ createdAt: -1 }).limit(10);
        res.json(testimonials);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// POST /api/testimonials — citizen submits (must be Aadhaar verified)
router.post("/", auth, async (req, res) => {
    try {
        const { text, rating, city } = req.body;
        if (!text?.trim() || !rating || !city?.trim())
            return res.status(400).json({ message: "Text, rating and city are required" });
        if (text.length > 300)
            return res.status(400).json({ message: "Testimonial must be under 300 characters" });

        const user = await User.findById(req.user.id);
        if (!user.aadhaarVerified)
            return res.status(403).json({ message: "Only Aadhaar verified citizens can submit testimonials" });

        // One testimonial per user
        const existing = await Testimonial.findOne({ user: req.user.id });
        if (existing)
            return res.status(400).json({ message: "You have already submitted a testimonial" });

        const testimonial = new Testimonial({
            user: req.user.id,
            name: user.name,
            city: city.trim(),
            text: text.trim(),
            rating,
        });
        await testimonial.save();
        res.status(201).json({ message: "Thank you! Your testimonial is under review and will appear once approved.", testimonial });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// POST /api/testimonials/:id/approve — admin approves
router.post("/:id/approve", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const t = await Testimonial.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
        if (!t) return res.status(404).json({ message: "Not found" });
        res.json({ message: "Approved", testimonial: t });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/testimonials/:id — admin removes
router.delete("/:id", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        await Testimonial.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;