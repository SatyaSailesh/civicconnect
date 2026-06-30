const express = require("express");
const router = express.Router();
const path = require("path");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const AUTHORITY_LEVELS = ["", "Local Office", "Municipal Officer", "Legislative Assembly", "Chief Minister"];

// ── POST / — Create Complaint (with image upload) ─────────────────────────────
router.post("/", auth, upload.array("images", 2), async (req, res) => {
    try {
        const { title, description, category, location, city, district, state, pincode, lat, lng, priority } = req.body;
        const locationStr = location || [city, district, state].filter(Boolean).join(", ") || "Not specified";

        if (!title || !description || !category || !locationStr) {
            return res.status(400).json({ message: "title, description, category and location are required" });
        }

        // Build image URLs from uploaded files
        const images = (req.files || []).map(f => f.path); // Cloudinary returns full URL in f.path

        const citizen = await User.findById(req.user.id);
        const performedBy = citizen ? citizen.name : "Citizen";

        const complaint = new Complaint({
            user: req.user.id, title, description, category,
            location: locationStr, city, district, state, pincode,
            lat: lat ? Number(lat) : null,
            lng: lng ? Number(lng) : null,
            priority: priority || "Normal",
            images,
            history: [{
                action: "Created",
                description: "Complaint submitted by citizen.",
                performedBy,
                timestamp: new Date()
            }]
        });

        const saved = await complaint.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error("Create complaint error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ── GET /my — Citizen's own complaints ───────────────────────────────────────
router.get("/my", auth, async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── GET / — All complaints ────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate("user", "name email aadhaarVerified")
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── GET /track/:trackingId — Fetch complaint by tracking ID ────────────────────
router.get("/track/:trackingId", auth, async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ complaintId: req.params.trackingId })
            .populate("user", "name email aadhaarVerified")
            .populate("messages.sender", "name role");
        
        if (!complaint) {
            return res.status(404).json({ message: "Complaint with this Tracking ID does not exist" });
        }

        // Authorization check: Admins can access all. Citizens can only access if it's their own or if it's public.
        const isOwner = complaint.user._id.toString() === req.user.id;
        if (req.user.role !== "admin" && !isOwner && !complaint.isPublic) {
            return res.status(403).json({ message: "Access denied to private complaint" });
        }

        res.json(complaint);
    } catch (err) {
        console.error("Track complaint error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// ── GET /:id — Single complaint ───────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate("user", "name email aadhaarVerified")
            .populate("messages.sender", "name role");
        if (!complaint) return res.status(404).json({ message: "Not found" });
        const isOwner = complaint.user._id.toString() === req.user.id;
        if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
        res.json(complaint);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── PUT /:id — Update status + priority + feedback (Admin) ───────────────────
router.put("/:id", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const { status, adminFeedback, priority } = req.body;
        
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });

        const adminUser = await User.findById(req.user.id);
        const performedBy = adminUser ? adminUser.name : "Admin";

        const oldStatus = complaint.status;
        const oldPriority = complaint.priority;

        let historyEvents = [];

        // Track status change
        if (status && status !== oldStatus) {
            complaint.status = status;
            
            if (status === "Resolved") {
                historyEvents.push({
                    action: "Complaint Resolved",
                    description: "Complaint resolved by authority.",
                    performedBy,
                    timestamp: new Date()
                });
            } else {
                historyEvents.push({
                    action: "Status Updated",
                    description: `${oldStatus} → ${status}`,
                    performedBy,
                    timestamp: new Date()
                });
            }
        }

        // Track priority change
        if (priority && priority !== oldPriority) {
            complaint.priority = priority;
            historyEvents.push({
                action: "Priority Changed",
                description: `${oldPriority} → ${priority}`,
                performedBy,
                timestamp: new Date()
            });
        }

        // Apply feedback
        if (adminFeedback !== undefined) {
            complaint.adminFeedback = adminFeedback;
        }

        // Append events
        if (historyEvents.length > 0) {
            if (!complaint.history) {
                complaint.history = [];
            }
            complaint.history.push(...historyEvents);
        }

        const saved = await complaint.save();
        const updated = await Complaint.findById(saved._id).populate("user", "name email aadhaarVerified");
        res.json(updated);
    } catch (err) {
        console.error("Update error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// ── POST /:id/escalate — Escalate with formal letter (Admin) ─────────────────
router.post("/:id/escalate", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const { reason } = req.body;
        const complaint = await Complaint.findById(req.params.id).populate("user", "name email aadhaarVerified");
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.escalationLevel >= 4) return res.status(400).json({ message: "Already at maximum escalation level" });

        const newLevel = complaint.escalationLevel + 1;
        const toAuthority = AUTHORITY_LEVELS[newLevel];
        const fromAuthority = AUTHORITY_LEVELS[complaint.escalationLevel];
        const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

        // Generate formal escalation letter
        const letterText = `
GOVERNMENT OF INDIA — CIVIC GRIEVANCE ESCALATION NOTICE
Date: ${date}
Complaint ID: ${complaint.complaintId || complaint._id.toString().slice(-6).toUpperCase()}

TO: ${toAuthority}
FROM: ${fromAuthority} / CivicConnect Authority Portal

SUBJECT: Escalation of Civic Complaint — "${complaint.title}"

Dear ${toAuthority},

This is to formally escalate the following unresolved civic complaint to your office for immediate attention and appropriate action.

COMPLAINT DETAILS:
- Title: ${complaint.title}
- Category: ${complaint.category}
- Location: ${complaint.location}
- Filed By: ${complaint.user?.name} (Citizen)
- Filed On: ${new Date(complaint.createdAt).toLocaleDateString("en-IN")}
- Current Status: ${complaint.status}
- Previous Level: ${fromAuthority}

DESCRIPTION:
${complaint.description}

REASON FOR ESCALATION:
${reason}

This complaint has not been resolved at the ${fromAuthority} level despite being filed on ${new Date(complaint.createdAt).toLocaleDateString("en-IN")}. We request your office to take immediate cognizance of this matter and ensure its resolution at the earliest.

All relevant evidence and documentation are available on the CivicConnect portal.

Regards,
CivicConnect Authority Portal
Government Grievance Redressal System
    `.trim();

        const letter = {
            toAuthority,
            level: newLevel,
            reason,
            letterText,
            escalatedBy: req.user.id,
            escalatedAt: new Date(),
        };

        const adminUser = await User.findById(req.user.id);
        const performedBy = adminUser ? adminUser.name : "Admin";

        const oldStatus = complaint.status;

        // Update fields directly on document
        complaint.escalationLevel = newLevel;
        complaint.status = "In Progress";
        complaint.escalationLetters.push(letter);

        if (!complaint.history) {
            complaint.history = [];
        }

        // Add history events
        complaint.history.push({
            action: `Assigned to ${toAuthority}`,
            description: `Escalated from ${fromAuthority} to ${toAuthority}.`,
            performedBy,
            timestamp: new Date()
        });

        if (oldStatus !== "In Progress") {
            complaint.history.push({
                action: "Status Updated",
                description: `${oldStatus} → In Progress`,
                performedBy,
                timestamp: new Date()
            });
        }

        const saved = await complaint.save();
        const updated = await Complaint.findById(saved._id).populate("user", "name email aadhaarVerified");
        res.json({ complaint: updated, letter });
    } catch (err) {
        console.error("Escalation error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ── POST /:id/message — Add message to thread ─────────────────────────────────
router.post("/:id/message", auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: "Message text required" });

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });

        const isOwner = complaint.user.toString() === req.user.id;
        if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

        // Citizens can only message if admin has opened the chat thread
        if (req.user.role === "citizen" && !complaint.chatEnabled) {
            return res.status(403).json({ message: "Chat thread is closed. Request the authority to reopen it." });
        }

        const message = { sender: req.user.id, senderRole: req.user.role, text: text.trim() };
        complaint.messages.push(message);
        await complaint.save();

        const updated = await Complaint.findById(req.params.id).populate("messages.sender", "name role");
        res.json(updated.messages[updated.messages.length - 1]);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ── POST /:id/rate — Rate resolution ─────────────────────────────────────────
router.post("/:id/rate", auth, async (req, res) => {
    try {
        const { rating, ratingComment } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1–5" });
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.user.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });
        if (complaint.status !== "Resolved") return res.status(400).json({ message: "Can only rate resolved complaints" });
        complaint.rating = rating;
        complaint.ratingComment = ratingComment || "";
        await complaint.save();
        res.json(complaint);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.user.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });
        await Complaint.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});


// ── POST /:id/toggle-chat — Admin opens or closes chat thread ─────────────────
router.post("/:id/toggle-chat", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        complaint.chatEnabled = !complaint.chatEnabled;
        // Clear reopen request when admin responds
        if (complaint.chatEnabled) complaint.chatReopenRequested = false;
        await complaint.save();
        res.json({
            chatEnabled: complaint.chatEnabled,
            message: complaint.chatEnabled ? "Chat thread opened for citizen" : "Chat thread closed"
        });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── POST /:id/request-reopen — Citizen requests chat to be reopened ───────────
router.post("/:id/request-reopen", auth, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.user.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });
        if (complaint.chatEnabled) return res.status(400).json({ message: "Chat is already open" });
        complaint.chatReopenRequested = true;
        await complaint.save();
        res.json({ message: "Reopen request sent to authority" });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;