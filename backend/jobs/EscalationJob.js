// ─── Escalation Cron Job ───────────────────────────────────────────────────────
// Auto-escalates complaints with no response after 3 days
// Run this file alongside server.js: it checks every hour

const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { notifyEscalation } = require('./emailService');

const ESCALATION_DAYS = 3; // escalate after 3 days of no update
const MAX_LEVEL = 4;

async function runEscalation() {
    try {
        const cutoff = new Date(Date.now() - ESCALATION_DAYS * 24 * 60 * 60 * 1000);

        // Find complaints that are still pending/in-progress, not yet at max level,
        // and haven't been updated in ESCALATION_DAYS days
        const stale = await Complaint.find({
            status: { $in: ['Pending', 'In Progress'] },
            escalationLevel: { $lt: MAX_LEVEL },
            updatedAt: { $lt: cutoff },
        }).populate('user', 'name email emailNotifications');

        if (stale.length === 0) return;

        console.log(`⚡ Escalation job: ${stale.length} complaints to escalate`);

        for (const complaint of stale) {
            const newLevel = (complaint.escalationLevel || 1) + 1;

            const updated = await Complaint.findOneAndUpdate(
                { _id: complaint._id, escalationLevel: complaint.escalationLevel, updatedAt: complaint.updatedAt },
                {
                    $set: { escalationLevel: newLevel, staffActionAt: complaint.staffActionAt || new Date() },
                    $push: {
                        history: {
                            action: "Automatically Escalated",
                            description: `Escalated to level ${newLevel} after ${ESCALATION_DAYS} days without an update.`,
                            performedBy: "CivicConnect",
                            timestamp: new Date(),
                        },
                    },
                }
            );
            if (!updated) continue;

            // Notify citizen
            if (complaint.user?.email && complaint.user.emailNotifications !== false) {
                await notifyEscalation({
                    citizenEmail: complaint.user.email,
                    citizenName: complaint.user.name,
                    complaintTitle: complaint.title,
                    escalationLevel: newLevel,
                });
            }

            console.log(`🔺 Escalated complaint "${complaint.title}" to level ${newLevel}`);
        }
    } catch (err) {
        console.error('Escalation job error:', err.message);
    }
}

// Run every hour
function startEscalationJob() {
    console.log('⏰ Escalation job started — checks every hour');
    cron.schedule('0 * * * *', runEscalation);
    // Also run once immediately on startup
    runEscalation();
}

module.exports = { startEscalationJob };
