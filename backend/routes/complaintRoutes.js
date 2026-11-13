const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { notifyStatusUpdate } = require("../jobs/emailService");

const { PUBLIC_FIELDS, visibleTo } = require('../services/complaintAccess');
const { coordinates, distanceMeters } = require('../services/complaintLocation');
const { routeComplaint } = require('../services/complaintRouting');
const { publicQuery, areaQuery } = require('../services/complaintAccess');

const AUTHORITY_LEVELS = ["", "Local Office", "Municipal Officer", "Legislative Assembly", "Chief Minister"];

router.param("id", (req, res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ message: "Invalid complaint ID" });
    next();
});

// ── POST / — Create Complaint (with image upload) ─────────────────────────────
async function verifiedCitizen(req, res, next) {
    if (req.user.role !== "citizen") return res.status(403).json({ message: "Only citizens can submit complaints" });
    try {
        const citizen = await User.findById(req.user.id).select("name aadhaarVerified");
        if (!citizen?.aadhaarVerified)
            return res.status(403).json({ message: "Verify your demo Aadhaar before submitting a complaint" });
        req.citizen = citizen;
        next();
    } catch (error) {
        next(error);
    }
}

router.post("/", auth, verifiedCitizen, upload.array("images", 2), async (req, res) => {
    try {
        const { title, description, category, location, city, district, state, pincode, lat, lng, priority, isPublic } = req.body;
        const locationStr = location || [city, district, state].filter(Boolean).join(", ");

        if (![title, description, category, locationStr].every(value => typeof value === "string" && value.trim())) {
            return res.status(400).json({ message: "title, description, category and location are required" });
        }

        // Build image URLs from uploaded files
        const point = coordinates(lat, lng);
        const images = (req.files || []).map(f => f.path); // Cloudinary returns full URL in f.path

        const performedBy = req.citizen.name;

        const route = routeComplaint({ category, city, state });
        const routeHistory = route.routingSource === 'verified'
            ? [{ action: 'Department Routed', description: `Routed to ${route.assignedDepartment} for ${route.jurisdiction} under a verified mapping.`, performedBy, timestamp: new Date() }]
            : [{ action: 'Routing Review Required', description: 'No unique verified category and jurisdiction mapping is configured. An approved official must review this complaint.', performedBy: 'CivicConnect', timestamp: new Date() }];
        if (route.routingSource === 'demo') routeHistory.push({ action: 'Demo Routing Suggestion', description: `Demo configuration suggests ${route.assignedDepartment} for ${route.jurisdiction}; approved official review is still required.`, performedBy: 'CivicConnect', timestamp: new Date() });
        const complaint = new Complaint({
            user: req.user.id, title, description, category,
            location: locationStr, city, district, state, pincode,
            lat: point.lat,
            lng: point.lng,
            priority: priority || "Normal",
            isPublic: isPublic === true || isPublic === "true",
            images,
            ...route,
            history: [{
                action: "Created",
                description: "Complaint submitted by citizen.",
                performedBy,
                timestamp: new Date()
            }, ...routeHistory]
        });

        const saved = await complaint.save();
        res.status(201).json(saved);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        if (err.name === "ValidationError") return res.status(400).json({ message: "Invalid complaint data" });
        console.error("Create complaint error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// ── GET /my — Citizen's own complaints ───────────────────────────────────────
router.get('/duplicates', auth, async (req, res, next) => {
    try {
        const point = coordinates(req.query.lat, req.query.lng);
        if (point.lat === null || !['Infrastructure', 'Corruption', 'Scam', 'Public Service'].includes(req.query.category))
            return res.status(400).json({ message: 'Choose valid coordinates and a category.' });
        const configured = Number(process.env.DUPLICATE_RADIUS_METERS || 300);
        const radiusMeters = Number.isFinite(configured) && configured > 0 && configured <= 10000 ? configured : 300;
        const candidates = await Complaint.find({ ...visibleTo(req.user), category: req.query.category,
            status: { $in: ['Pending', 'In Progress'] }, lat: { $ne: null }, lng: { $ne: null } })
            .select(PUBLIC_FIELDS).populate({ path: 'user', select: 'name -_id' }).lean();
        const matches = candidates.map(candidate => ({ ...candidate, distanceMeters: Math.round(distanceMeters(point, candidate)) }))
            .filter(candidate => candidate.distanceMeters <= radiusMeters).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 10);
        res.json({ radiusMeters, matches });
    } catch (error) { next(error); }
});

router.get('/followed', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('followedComplaints');
        const complaints = await Complaint.find({ ...visibleTo(req.user), _id: { $in: user.followedComplaints || [] } })
            .select(PUBLIC_FIELDS).populate({ path: 'user', select: 'name -_id' }).sort({ updatedAt: -1 });
        res.json(complaints);
    } catch (error) { next(error); }
});

router.post('/:id/follow', auth, async (req, res, next) => {
    try {
        if (typeof req.body.following !== 'boolean') return res.status(400).json({ message: 'following must be true or false' });
        if (!await Complaint.exists({ _id: req.params.id, ...visibleTo(req.user) })) return res.status(404).json({ message: 'Complaint not available' });
        const change = req.body.following ? { $addToSet: { followedComplaints: req.params.id } } : { $pull: { followedComplaints: req.params.id } };
        const user = await User.findByIdAndUpdate(req.user.id, change, { new: true }).select('followedComplaints');
        res.json({ followedComplaints: user.followedComplaints });
    } catch (error) { next(error); }
});

router.get('/visible', auth, async (req, res, next) => {
    try {
        const complaints = await Complaint.find({ ...visibleTo(req.user), status: { $ne: 'Withdrawn' } }).select(PUBLIC_FIELDS)
            .populate({ path: 'user', select: 'name -_id' }).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) { next(error); }
});

router.get('/areas', async (req, res, next) => {
    try {
        const areas = await Complaint.aggregate([
            { $match: { isPublic: true, status: { $ne: 'Withdrawn' }, city: { $type: 'string', $ne: '' }, state: { $type: 'string', $ne: '' } } },
            { $group: { _id: { city: { $trim: { input: '$city' } }, state: { $trim: { input: '$state' } } } } },
            { $sort: { '_id.state': 1, '_id.city': 1 } }, { $limit: 250 },
        ]);
        res.json(areas.map(({ _id }) => _id));
    } catch (error) { next(error); }
});

router.get("/my", auth, async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── GET / — Public complaints ─────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
    try {
        const complaints = await Complaint.find({ ...publicQuery(req.query), status: { $ne: 'Withdrawn' } }).select(PUBLIC_FIELDS)
            .populate({ path: "user", select: "name -_id" })
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) { next(err); }
});

// ── GET /admin — All complaints (Admin) ───────────────────────────────────────
router.get("/admin", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
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
        const complaint = await Complaint.findOne({ complaintId: req.params.trackingId.toUpperCase() });
        if (!complaint) return res.status(404).json({ message: "Complaint with this Tracking ID does not exist" });

        const isOwner = complaint.user.toString() === req.user.id;
        if (req.user.role !== "admin" && !isOwner) {
            if (!complaint.isPublic || complaint.status === 'Withdrawn') return res.status(403).json({ message: "Access denied to private complaint" });
            const summary = await Complaint.findOne({ _id: complaint._id, isPublic: true, status: { $ne: 'Withdrawn' } })
                .select(PUBLIC_FIELDS)
                .populate({ path: "user", select: "name -_id" });
            if (!summary) return res.status(404).json({ message: "Complaint not found" });
            return res.json(summary);
        }

        await complaint.populate([
            { path: "user", select: "name email aadhaarVerified" },
            { path: "messages.sender", select: "name role" },
        ]);

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
        const isOwner = complaint.user?._id.toString() === req.user.id;
        if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
        res.json(complaint);
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// ── PUT /:id — Update status + priority + feedback (Admin) ───────────────────
router.put("/:id", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const { status, adminFeedback, priority } = req.body;
        if ((status !== undefined && !["Pending", "In Progress", "Resolved", "Rejected"].includes(status)) ||
            (priority !== undefined && !["Normal", "High", "Critical"].includes(priority)) ||
            (adminFeedback !== undefined && typeof adminFeedback !== "string")) {
            return res.status(400).json({ message: "Invalid status, priority or feedback" });
        }
        
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.status === 'Withdrawn') return res.status(409).json({ message: 'Withdrawn complaints cannot be updated.' });
        if (req.body.version !== undefined && req.body.version !== complaint.__v)
            return res.status(409).json({ message: 'This complaint changed while you were viewing it. Refresh and retry.' });

        const adminUser = await User.findById(req.user.id);
        const performedBy = adminUser ? adminUser.name : "Admin";

        const oldStatus = complaint.status;
        const oldPriority = complaint.priority;
        const oldAdminFeedback = complaint.adminFeedback;

        let historyEvents = [];

        // Track status change
        if (status && status !== oldStatus) {
            complaint.status = status;
            complaint.staffActionAt = complaint.staffActionAt || new Date();
            
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
            complaint.staffActionAt = complaint.staffActionAt || new Date();
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
            if (adminFeedback !== oldAdminFeedback) {
                complaint.staffActionAt = complaint.staffActionAt || new Date();
                historyEvents.push({
                    action: "Official Response Updated",
                    description: adminFeedback ? "Official response added or updated." : "Official response cleared.",
                    performedBy,
                    timestamp: new Date()
                });
            }
        }

        // Append events
        if (historyEvents.length > 0) {
            if (!complaint.history) {
                complaint.history = [];
            }
            complaint.history.push(...historyEvents);
        }

        if (status && status !== oldStatus && status !== 'Pending') complaint.staffActionAt = complaint.staffActionAt || new Date();
        const saved = await complaint.save();
        const updated = await Complaint.findById(saved._id).populate("user", "name email aadhaarVerified emailNotifications");

        if (status && status !== oldStatus && updated.user?.email && updated.user.emailNotifications !== false) {
            try {
                await notifyStatusUpdate({
                    citizenEmail: updated.user.email,
                    citizenName: updated.user.name,
                    complaintTitle: updated.title,
                    newStatus: updated.status,
                    adminFeedback: updated.adminFeedback,
                });
            } catch (err) {
                console.error("Status update email failed:", err.message);
            }
        }

        res.json(updated);
    } catch (err) {
        if (err.name === 'VersionError') return res.status(409).json({ message: 'This complaint changed while you were viewing it. Refresh and retry.' });
        console.error("Update error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// ── POST /:id/escalate — Escalate with formal letter (Admin) ─────────────────
router.post("/:id/escalate", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const { reason } = req.body;
        if (typeof reason !== "string" || !reason.trim())
            return res.status(400).json({ message: "An escalation reason is required" });
        const complaint = await Complaint.findById(req.params.id).populate("user", "name email aadhaarVerified");
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (["Resolved", "Rejected", "Withdrawn"].includes(complaint.status))
            return res.status(400).json({ message: "Only open complaints can be escalated" });
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
        complaint.staffActionAt = complaint.staffActionAt || new Date();
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
        res.status(500).json({ message: "Server error" });
    }
});

// ── POST /:id/message — Add message to thread ─────────────────────────────────
router.post("/:id/message", auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (typeof text !== "string" || !text.trim()) return res.status(400).json({ message: "Message text required" });

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.status === 'Withdrawn') return res.status(409).json({ message: 'Withdrawn complaints cannot receive messages.' });

        const isOwner = complaint.user.toString() === req.user.id;
        if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

        // Citizens can only message if admin has opened the chat thread
        if (req.user.role === "citizen" && !complaint.chatEnabled) {
            return res.status(403).json({ message: "Chat thread is closed. Request the authority to reopen it." });
        }

        const message = { sender: req.user.id, senderRole: req.user.role, text: text.trim() };
        complaint.messages.push(message);
        if (req.user.role === 'admin') complaint.staffActionAt = complaint.staffActionAt || new Date();
        const added = complaint.messages.at(-1);
        await complaint.save();
        await complaint.populate("messages.sender", "name role");
        res.json(complaint.messages.id(added._id));
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ── POST /:id/rate — Rate resolution ─────────────────────────────────────────
router.post("/:id/rate", auth, async (req, res) => {
    try {
        const { rating, ratingComment } = req.body;
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be an integer from 1 to 5" });
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
router.patch("/:id/visibility", auth, async (req, res, next) => {
    try {
        if (typeof req.body.isPublic !== "boolean")
            return res.status(400).json({ message: "isPublic must be true or false" });
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.user.toString() !== req.user.id)
            return res.status(403).json({ message: "Only the complaint owner can change sharing" });
        if (complaint.status === 'Withdrawn') return res.status(409).json({ message: 'Withdrawn complaints cannot change sharing.' });
        if (complaint.isPublic !== req.body.isPublic) {
            complaint.isPublic = req.body.isPublic;
            complaint.history.push({ action: "Sharing Updated", description: complaint.isPublic ? "Citizen shared this complaint on the public feed." : "Citizen made this complaint private.", performedBy: "Citizen" });
            await complaint.save();
        }
        res.json(complaint);
    } catch (error) { next(error); }
});

router.patch('/:id/citizen-edit', auth, async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        if (req.user.role !== 'citizen' || complaint.user.toString() !== req.user.id) return res.status(403).json({ message: 'Only the complaint owner can edit this complaint.' });
        if (complaint.status !== 'Pending' || complaint.assignedTo || complaint.staffActionAt || complaint.chatEnabled || complaint.escalationLevel > 1 || complaint.withdrawnAt)
            return res.status(409).json({ message: 'Staff have started work. Send a correction request instead.' });
        if (req.body.version !== complaint.__v) return res.status(409).json({ message: 'This complaint changed while you were editing it. Refresh and retry.' });
        const fields = ['title', 'description', 'category', 'location', 'city', 'district', 'state', 'pincode'];
        for (const field of fields) if (req.body[field] !== undefined && typeof req.body[field] !== 'string') return res.status(400).json({ message: `Invalid ${field}` });
        const changes = {};
        for (const field of fields) if (typeof req.body[field] === 'string' && req.body[field].trim() && req.body[field].trim() !== (complaint[field] || '')) changes[field] = req.body[field].trim();
        if (req.body.lat !== undefined || req.body.lng !== undefined) {
            const point = coordinates(req.body.lat, req.body.lng);
            changes.lat = point.lat; changes.lng = point.lng;
        }
        if (!Object.keys(changes).length) return res.status(400).json({ message: 'Make at least one valid change.' });
        Object.assign(complaint, changes);
        complaint.history.push({ action: 'Citizen Correction', description: `Citizen updated: ${Object.keys(changes).join(', ')}.`, performedBy: 'Citizen' });
        await complaint.save();
        res.json(complaint);
    } catch (error) { if (error.name === 'VersionError') return res.status(409).json({ message: 'This complaint changed while you were editing it. Refresh and retry.' }); next(error); }
});

router.post('/:id/corrections', auth, async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        if (req.user.role !== 'citizen' || complaint.user.toString() !== req.user.id) return res.status(403).json({ message: 'Only the complaint owner can request a correction.' });
        if (['Resolved', 'Rejected', 'Withdrawn'].includes(complaint.status)) return res.status(409).json({ message: 'This complaint can no longer be corrected.' });
        if (typeof req.body.message !== 'string' || !req.body.message.trim() || req.body.message.length > 1000) return res.status(400).json({ message: 'Enter a correction request (up to 1000 characters).' });
        if (req.body.version !== complaint.__v) return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' });
        complaint.correctionRequests.push({ message: req.body.message.trim() });
        complaint.history.push({ action: 'Correction Requested', description: req.body.message.trim(), performedBy: 'Citizen' });
        await complaint.save();
        res.status(201).json(complaint);
    } catch (error) { if (error.name === 'VersionError') return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' }); next(error); }
});

router.post('/:id/withdraw', auth, async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        if (req.user.role !== 'citizen' || complaint.user.toString() !== req.user.id) return res.status(403).json({ message: 'Only the complaint owner can withdraw this complaint.' });
        if (['Resolved', 'Rejected', 'Withdrawn'].includes(complaint.status)) return res.status(409).json({ message: 'This complaint can no longer be withdrawn.' });
        if (req.body.version !== complaint.__v) return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' });
        complaint.status = 'Withdrawn'; complaint.withdrawnAt = new Date(); complaint.withdrawnBy = req.user.id;
        complaint.history.push({ action: 'Complaint Withdrawn', description: 'Citizen withdrew this complaint. The case history is retained.', performedBy: 'Citizen' });
        await complaint.save();
        res.json(complaint);
    } catch (error) { if (error.name === 'VersionError') return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' }); next(error); }
});

router.patch('/:id/assignment', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        if (complaint.status === 'Withdrawn') return res.status(409).json({ message: 'Withdrawn complaints cannot be assigned.' });
        if (req.body.version !== complaint.__v) return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' });
        if (typeof req.body.department !== 'string' || !req.body.department.trim() || typeof req.body.jurisdiction !== 'string' || !req.body.jurisdiction.trim()) return res.status(400).json({ message: 'Department and jurisdiction are required.' });
        const previous = complaint.assignedDepartment ? `${complaint.assignedDepartment} (${complaint.jurisdiction})` : 'Review Queue';
        const next = `${req.body.department.trim()} (${req.body.jurisdiction.trim()})`;
        complaint.assignedDepartment = req.body.department.trim(); complaint.jurisdiction = req.body.jurisdiction.trim();
        complaint.routingStatus = 'assigned'; complaint.routingSource = 'official'; complaint.assignedTo = req.user.id; complaint.staffActionAt = complaint.staffActionAt || new Date();
        complaint.history.push({ action: previous === 'Review Queue' ? 'Department Assigned' : 'Department Reassigned', description: `${previous} → ${next}${typeof req.body.reason === 'string' && req.body.reason.trim() ? `: ${req.body.reason.trim().slice(0, 300)}` : ''}`, performedBy: 'Official' });
        await complaint.save();
        res.json(complaint);
    } catch (error) { if (error.name === 'VersionError') return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' }); next(error); }
});

router.patch('/:id/corrections/:correctionId', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
        if (!['accepted', 'declined'].includes(req.body.status)) return res.status(400).json({ message: 'Choose accepted or declined.' });
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        if (['Resolved', 'Rejected', 'Withdrawn'].includes(complaint.status)) return res.status(409).json({ message: 'This complaint is closed and its corrections can no longer be reviewed.' });
        if (req.body.version !== complaint.__v) return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' });
        const correction = complaint.correctionRequests.id(req.params.correctionId);
        if (!correction || correction.status !== 'pending') return res.status(404).json({ message: 'Pending correction not found.' });
        correction.status = req.body.status; correction.response = typeof req.body.response === 'string' ? req.body.response.trim().slice(0, 1000) : ''; correction.reviewedAt = new Date(); correction.reviewedBy = req.user.id;
        complaint.staffActionAt = complaint.staffActionAt || new Date();
        complaint.history.push({ action: `Correction ${req.body.status}`, description: correction.response || `Official ${req.body.status} the citizen correction request.`, performedBy: 'Official' });
        await complaint.save();
        res.json(complaint);
    } catch (error) { if (error.name === 'VersionError') return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' }); next(error); }
});

router.delete("/:id", auth, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.user.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });
        if (['Resolved', 'Rejected', 'Withdrawn'].includes(complaint.status)) return res.status(409).json({ message: 'This complaint can no longer be withdrawn.' });
        if (req.body.version !== complaint.__v) return res.status(409).json({ message: 'This complaint changed. Refresh and retry.' });
        complaint.status = 'Withdrawn'; complaint.withdrawnAt = new Date(); complaint.withdrawnBy = req.user.id;
        complaint.history.push({ action: 'Complaint Withdrawn', description: 'Citizen withdrew this complaint. The case history is retained.', performedBy: 'Citizen' });
        await complaint.save();
        res.json({ message: 'Complaint withdrawn; case history retained.', complaint });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});


// ── POST /:id/toggle-chat — Admin opens or closes chat thread ─────────────────
router.post("/:id/toggle-chat", auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: "Not found" });
        if (complaint.status === 'Withdrawn') return res.status(409).json({ message: 'Withdrawn complaints cannot reopen chat.' });
        complaint.chatEnabled = !complaint.chatEnabled;
        if (complaint.chatEnabled) complaint.staffActionAt = complaint.staffActionAt || new Date();
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
        if (complaint.status === 'Withdrawn') return res.status(409).json({ message: 'Withdrawn complaints cannot reopen chat.' });
        if (complaint.chatEnabled) return res.status(400).json({ message: "Chat is already open" });
        complaint.chatReopenRequested = true;
        await complaint.save();
        res.json({ message: "Reopen request sent to authority" });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
