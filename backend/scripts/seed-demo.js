require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

async function main() {
    const uri = process.env.MONGO_URI || '';
    // Explicitly refuse remote, production, or ambiguous targets. Never delete existing data.
    if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/civicconnect_demo(?:\?.*)?$/.test(uri)) {
        throw new Error('Demo seeding requires mongodb://127.0.0.1:<port>/civicconnect_demo');
    }
    await mongoose.connect(uri);
    await Promise.all([User.init(), Complaint.init()]);
    const password = await bcrypt.hash('Demo-password-2026!', 12);
    for (const [email, name, role, isApproved] of [
        ['citizen@example.test', 'Demo Citizen', 'citizen', true],
        ['other@example.test', 'Second Citizen', 'citizen', true],
        ['official@example.test', 'Demo Official', 'admin', true],
        ['pending@example.test', 'Pending Official', 'admin', false],
    ]) {
        await User.updateOne({ email }, { $setOnInsert: { email, name, password, role, isApproved, aadhaarVerified: false } }, { upsert: true });
    }
    const citizen = await User.findOne({ email: 'citizen@example.test' });
    for (const [title, status, isPublic] of [
        ['[Demo] Park footpath repair', 'Pending', false],
        ['[Demo] Waste collection request', 'In Progress', true],
        ['[Demo] Water tap repaired', 'Resolved', false],
    ]) {
        if (await Complaint.exists({ user: citizen._id, title })) continue;
        await Complaint.create({ user: citizen._id, title, status, isPublic,
            description: 'Synthetic portfolio demonstration. No real personal data.',
            category: 'Public Service', location: 'Demo Park, Example Road, Hyderabad',
            city: 'Hyderabad', lat: 17.385, lng: 78.4867,
            history: [{ action: 'Created', description: 'Synthetic demo complaint.', performedBy: 'Demo Citizen' },
                ...(status === 'Pending' ? [] : [{ action: status === 'Resolved' ? 'Complaint Resolved' : 'Status Updated', description: `Demo status: ${status}`, performedBy: 'Demo Official' }])],
        });
    }
    console.log('Demo ready. Accounts: citizen@example.test, other@example.test, official@example.test, pending@example.test');
    console.log('Initial password: Demo-password-2026! Existing accounts and complaints were preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
