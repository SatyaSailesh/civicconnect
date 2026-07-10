const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const STATUS_ORDER = ["Pending", "In Progress", "Resolved", "Rejected"];
const CATEGORIES = ["Infrastructure", "Corruption", "Scam", "Public Service"];

function buildLast7DaysSeries(dayCounts) {
    const countMap = {};
    (dayCounts || []).forEach(({ _id, count }) => {
        countMap[_id] = count;
    });

    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - 6 + i);
        const key = d.toISOString().slice(0, 10);
        return {
            name: d.toLocaleDateString("en-IN", { weekday: "short" }),
            date: key,
            complaints: countMap[key] || 0,
        };
    });
}

function formatStatusDistribution(groups) {
    const countMap = {};
    (groups || []).forEach(({ _id, count }) => {
        countMap[_id] = count;
    });
    return STATUS_ORDER.map((name) => ({
        name,
        value: countMap[name] || 0,
    }));
}

function formatCategoryDistribution(groups) {
    const countMap = {};
    (groups || []).forEach(({ _id, count }) => {
        countMap[_id] = count;
    });
    return CATEGORIES.map((cat) => ({
        name: cat.split(" ")[0],
        category: cat,
        value: countMap[cat] || 0,
    }));
}

// ── GET /citizen — Citizen dashboard analytics ────────────────────────────────
router.get("/citizen", auth, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        const [result] = await Complaint.aggregate([
            { $match: { user: userId } },
            {
                $facet: {
                    stats: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                pending: {
                                    $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
                                },
                                inProgress: {
                                    $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
                                },
                                resolved: {
                                    $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
                                },
                                escalated: {
                                    $sum: { $cond: [{ $gt: ["$escalationLevel", 1] }, 1, 0] },
                                },
                            },
                        },
                    ],
                    latestComplaints: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                    ],
                },
            },
        ]);

        const stats = result?.stats?.[0] || {
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0,
            escalated: 0,
        };

        res.json({
            total: stats.total,
            pending: stats.pending,
            inProgress: stats.inProgress,
            resolved: stats.resolved,
            escalated: stats.escalated,
            latestComplaints: result?.latestComplaints || [],
        });
    } catch (err) {
        console.error("Citizen dashboard error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// ── GET /admin — Admin dashboard analytics ────────────────────────────────────
router.get("/admin", auth, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admins only" });
    }

    try {
        const startOfRange = new Date();
        startOfRange.setHours(0, 0, 0, 0);
        startOfRange.setDate(startOfRange.getDate() - 6);

        const [complaintResult, totalCitizens] = await Promise.all([
            Complaint.aggregate([
                {
                    $facet: {
                        stats: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    pending: {
                                        $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
                                    },
                                    inProgress: {
                                        $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
                                    },
                                    resolved: {
                                        $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
                                    },
                                    escalated: {
                                        $sum: { $cond: [{ $gt: ["$escalationLevel", 1] }, 1, 0] },
                                    },
                                    highPriority: {
                                        $sum: {
                                            $cond: [{ $eq: ["$priority", "Critical"] }, 1, 0],
                                        },
                                    },
                                },
                            },
                        ],
                        statusDistribution: [
                            { $group: { _id: "$status", count: { $sum: 1 } } },
                        ],
                        categoryDistribution: [
                            { $group: { _id: "$category", count: { $sum: 1 } } },
                        ],
                        last7Days: [
                            { $match: { createdAt: { $gte: startOfRange } } },
                            {
                                $group: {
                                    _id: {
                                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                                    },
                                    count: { $sum: 1 },
                                },
                            },
                            { $sort: { _id: 1 } },
                        ],
                    },
                },
            ]),
            User.countDocuments({ role: "citizen" }),
        ]);

        const stats = complaintResult?.[0]?.stats?.[0] || {
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0,
            escalated: 0,
            highPriority: 0,
        };

        res.json({
            total: stats.total,
            pending: stats.pending,
            inProgress: stats.inProgress,
            resolved: stats.resolved,
            escalated: stats.escalated,
            highPriority: stats.highPriority,
            totalCitizens,
            statusDistribution: formatStatusDistribution(
                complaintResult?.[0]?.statusDistribution
            ),
            categoryDistribution: formatCategoryDistribution(
                complaintResult?.[0]?.categoryDistribution
            ),
            last7Days: buildLast7DaysSeries(complaintResult?.[0]?.last7Days),
        });
    } catch (err) {
        console.error("Admin dashboard error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
