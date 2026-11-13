const mongoose = require("mongoose");

// Human-readable complaint ID counter
const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
const Counter = mongoose.model("Counter", counterSchema);

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["citizen", "admin"], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const EscalationLetterSchema = new mongoose.Schema({
    toAuthority: { type: String, required: true }, // "Municipal Officer", "MLA", "CM"
    level: { type: Number, required: true },
    reason: { type: String, required: true },
    letterText: { type: String, required: true }, // formal letter body
    escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    escalatedAt: { type: Date, default: Date.now },
});

const ComplaintSchema = new mongoose.Schema({
    complaintId: { type: String, unique: true }, // CC-2025-0001
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["Infrastructure", "Corruption", "Scam", "Public Service"], required: true },
    location: { type: String, required: true },
    city: { type: String, default: "" },
    district: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    status: { type: String, enum: ["Pending", "In Progress", "Resolved", "Rejected", "Withdrawn"], default: "Pending" },
    priority: { type: String, enum: ["Normal", "High", "Critical"], default: "Normal" },
    escalationLevel: { type: Number, default: 1, min: 1, max: 4 },
    escalationLetters: [EscalationLetterSchema],
    adminFeedback: { type: String, default: "" },
    images: [{ type: String }], // file paths stored by multer
    messages: [MessageSchema],   // follow-up thread
    rating: { type: Number, default: null, min: 1, max: 5 },
    ratingComment: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    assignedDepartment: { type: String, default: '' },
    jurisdiction: { type: String, default: '' },
    routingStatus: { type: String, enum: ['review', 'suggested', 'routed', 'assigned'], default: 'review' },
    routingSource: { type: String, enum: ['unmatched', 'demo', 'verified', 'official'], default: 'unmatched' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    staffActionAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
    withdrawnBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    correctionRequests: [{ message: { type: String, required: true, maxlength: 1000 }, status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }, response: { type: String, default: '' }, requestedAt: { type: Date, default: Date.now }, reviewedAt: Date, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
    chatEnabled: { type: Boolean, default: false },   // admin opens chat
    chatReopenRequested: { type: Boolean, default: false },   // citizen requests reopen
    history: [
        {
            action: { type: String, required: true },
            description: { type: String, required: true },
            performedBy: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
}, { timestamps: true });
ComplaintSchema.set('optimisticConcurrency', true);

// Auto-generate human-readable complaintId before save
ComplaintSchema.pre("save", async function (next) {
    if (this.complaintId) return next();
    try {
        const counter = await Counter.findByIdAndUpdate(
            "complaintId",
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const year = new Date().getFullYear();
        this.complaintId = `CC-${year}-${String(counter.seq).padStart(6, "0")}`;
        next();
    } catch (err) { next(err); }
});

module.exports = mongoose.model("Complaint", ComplaintSchema);
