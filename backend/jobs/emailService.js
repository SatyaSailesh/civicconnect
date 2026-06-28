// ─── Email Service using Nodemailer + Gmail ────────────────────────────────────
// Setup: Enable 2FA on your Gmail → generate App Password →
// Add to .env: EMAIL_USER=you@gmail.com  EMAIL_PASS=your_app_password

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App Password, NOT your real password
    },
});

// ── Verify connection on startup ──
transporter.verify((err) => {
    if (err) console.warn('⚠ Email service not configured:', err.message);
    else console.log('✅ Email service ready');
});

// ── Template ──────────────────────────────────────────────────────────────────
function buildEmail({ to, subject, heading, body, ctaText, ctaUrl, color = '#10b981' }) {
    return {
        from: `"CivicConnect" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#03070f;font-family:'Segoe UI',sans-serif">
        <div style="max-width:560px;margin:40px auto;background:#0d1825;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,${color},#3b82f6);padding:32px;text-align:center">
            <div style="font-size:28px;margin-bottom:8px">⚡</div>
            <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px">CivicConnect</h1>
            <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px">India's Civic Intelligence Platform</p>
          </div>
          <!-- Body -->
          <div style="padding:32px">
            <h2 style="color:white;font-size:20px;font-weight:700;margin:0 0 12px">${heading}</h2>
            <div style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7">${body}</div>
            ${ctaText ? `
            <div style="text-align:center;margin-top:28px">
              <a href="${ctaUrl || '#'}" style="display:inline-block;background:linear-gradient(135deg,${color},#3b82f6);color:white;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:700;font-size:14px">
                ${ctaText}
              </a>
            </div>` : ''}
          </div>
          <!-- Footer -->
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
            <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0">
              CivicConnect · Bridging Citizens & Government · India 🇮🇳
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
}

// ── Send helpers ───────────────────────────────────────────────────────────────
async function sendEmail(options) {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('📧 Email skipped (not configured):', options.subject);
            return;
        }
        await transporter.sendMail(buildEmail(options));
        console.log('📧 Email sent to', options.to);
    } catch (err) {
        console.error('📧 Email failed:', err.message);
    }
}

// ── Status update notification ─────────────────────────────────────────────────
async function notifyStatusUpdate({ citizenEmail, citizenName, complaintTitle, newStatus, adminFeedback }) {
    const statusColors = { Resolved: '#10b981', 'In Progress': '#3b82f6', Rejected: '#ef4444', Pending: '#f59e0b' };
    const statusEmojis = { Resolved: '✅', 'In Progress': '⚙️', Rejected: '❌', Pending: '⏳' };

    await sendEmail({
        to: citizenEmail,
        subject: `${statusEmojis[newStatus] || '📋'} Your complaint "${complaintTitle}" — ${newStatus}`,
        heading: `Complaint Status Updated`,
        color: statusColors[newStatus] || '#10b981',
        body: `
      <p>Hi <strong style="color:white">${citizenName}</strong>,</p>
      <p>Your complaint <strong style="color:white">"${complaintTitle}"</strong> has been updated.</p>
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:16px 0;border-left:3px solid ${statusColors[newStatus]}">
        <p style="margin:0;font-size:13px">Status: <strong style="color:${statusColors[newStatus]}">${statusEmojis[newStatus]} ${newStatus}</strong></p>
        ${adminFeedback ? `<p style="margin:10px 0 0;font-size:13px">Official response: <em style="color:rgba(255,255,255,0.8)">"${adminFeedback}"</em></p>` : ''}
      </div>
      ${newStatus === 'Resolved' ? '<p>Thank you for using CivicConnect to make your voice heard! 🙏</p>' : '<p>You can track your complaint progress on your dashboard.</p>'}
    `,
        ctaText: 'View Dashboard',
        ctaUrl: 'http://localhost:5173/citizen',
    });
}

// ── Escalation notification ────────────────────────────────────────────────────
async function notifyEscalation({ citizenEmail, citizenName, complaintTitle, escalationLevel }) {
    const levels = ['', 'Local Office', 'Municipal Officer', 'Legislative Assembly', 'Chief Minister'];
    await sendEmail({
        to: citizenEmail,
        subject: `🔺 Complaint escalated to ${levels[escalationLevel]} — "${complaintTitle}"`,
        heading: 'Complaint Escalated',
        color: '#ef4444',
        body: `
      <p>Hi <strong style="color:white">${citizenName}</strong>,</p>
      <p>Your complaint <strong style="color:white">"${complaintTitle}"</strong> has been escalated because it did not receive a response within 3 days.</p>
      <div style="background:rgba(239,68,68,0.08);border-radius:12px;padding:16px;margin:16px 0;border-left:3px solid #ef4444">
        <p style="margin:0;font-size:13px">Now with: <strong style="color:#ef4444">Level ${escalationLevel} — ${levels[escalationLevel]}</strong></p>
      </div>
      <p>Higher authorities will now review your complaint. We appreciate your patience.</p>
    `,
        ctaText: 'Track Complaint',
        ctaUrl: 'http://localhost:5173/citizen',
    });
}

// ── Welcome email ──────────────────────────────────────────────────────────────
async function sendWelcomeEmail({ email, name, aadhaarVerified }) {
    await sendEmail({
        to: email,
        subject: '🎉 Welcome to CivicConnect — Your voice matters!',
        heading: `Welcome, ${name}! 👋`,
        color: '#10b981',
        body: `
      <p>You've successfully joined CivicConnect — India's civic intelligence platform.</p>
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:13px">✅ Account created</p>
        <p style="margin:0 0 8px;font-size:13px">${aadhaarVerified ? '🪪 Aadhaar auto-verified' : '⏳ Aadhaar verification pending'}</p>
        <p style="margin:0;font-size:13px">📍 Location-based complaint filing enabled</p>
      </div>
      <p>Start filing complaints, tracking resolutions, and holding leaders accountable.</p>
    `,
        ctaText: 'Go to Dashboard',
        ctaUrl: 'http://localhost:5173/citizen',
    });
}

module.exports = { notifyStatusUpdate, notifyEscalation, sendWelcomeEmail };