import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const Icon = {
    x: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    send: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    download: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    search: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    pin: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>,
    check: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    logout: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    arrow: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>,
    chat: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    flag: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
};

const STATUS_CFG = {
    'Pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    'In Progress': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
    'Resolved': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
    'Rejected': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
};
const PRIORITY_CFG = {
    'Normal': { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' },
    'High': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'Critical': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};
const CAT_ICONS = { Infrastructure: '🏗️', Corruption: '⚖️', Scam: '🚨', 'Public Service': '🏛️' };
const LEVELS = ['', 'Local Office', 'Municipal Officer', 'Legislative Assembly', 'Chief Minister'];
const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

function timeAgo(d) {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, icon, delay = 0 }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
            whileHover={{ y: -3 }} className="relative group rounded-2xl p-6 cursor-default overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at 50% 0%,${color}15,transparent 70%)` }} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
            <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>{icon}</div>
                {sub && <span className="text-[10px] px-2 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{sub}</span>}
            </div>
            <p className="text-4xl font-extrabold text-white tracking-tight mb-1">{value}</p>
            <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans',sans-serif" }}>{label}</p>
        </motion.div>
    );
}

// ─── Image Gallery Modal ──────────────────────────────────────────────────────
function ImageGallery({ images, onClose }) {
    const [idx, setIdx] = useState(0);
    if (!images?.length) return null;
    return (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="relative max-w-3xl w-full">
                <img src={`${BASE_URL}${images[idx]}`} alt="evidence"
                    className="w-full max-h-[80vh] object-contain rounded-2xl" />
                <div className="absolute top-4 right-4 flex gap-2">
                    {images.map((_, i) => (
                        <button key={i} onClick={() => setIdx(i)}
                            className="w-3 h-3 rounded-full transition-all"
                            style={{ background: i === idx ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
                    ))}
                    <button onClick={onClose} className="ml-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                        <Icon.x className="w-4 h-4" />
                    </button>
                </div>
                {images.length > 1 && (
                    <div className="flex justify-center gap-3 mt-4">
                        {images.map((img, i) => (
                            <img key={i} src={`${BASE_URL}${img}`} alt=""
                                onClick={() => setIdx(i)}
                                className="w-20 h-14 object-cover rounded-xl cursor-pointer transition-all"
                                style={{ opacity: i === idx ? 1 : 0.4, border: i === idx ? '2px solid #10b981' : '2px solid transparent' }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Escalation Modal ─────────────────────────────────────────────────────────
function EscalateModal({ complaint, onClose, onEscalated }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);
    const [letter, setLetter] = useState('');
    const nextLevel = (complaint.escalationLevel || 1) + 1;
    const toAuth = LEVELS[nextLevel];

    const handleEscalate = async () => {
        if (!reason.trim()) return;
        setSaving(true);
        try {
            const { data } = await api.post(`/complaints/${complaint._id}/escalate`, { reason });
            setLetter(data.letter.letterText);
            setPreview(true);
            onEscalated(data.complaint);
        } catch (err) {
            alert(err.response?.data?.message || 'Escalation failed');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ fontFamily: "'Syne','DM Sans',sans-serif" }} onClick={onClose}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }} className="w-full max-w-lg rounded-3xl overflow-hidden"
                style={{ background: 'rgba(10,16,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}>

                <div className="px-7 py-5 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <p className="text-xs text-red-400 font-semibold mb-0.5">⚠ Escalate Complaint</p>
                        <h3 className="text-lg font-extrabold text-white">{complaint.title}</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40"
                        style={{ background: 'rgba(255,255,255,0.06)' }}><Icon.x className="w-4 h-4" /></button>
                </div>

                {!preview ? (
                    <div className="px-7 py-6 space-y-5">
                        {/* Current → Next level */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl"
                            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <div className="text-center flex-1">
                                <p className="text-[10px] text-white/30 mb-1">FROM</p>
                                <p className="text-sm font-bold text-white">{LEVELS[complaint.escalationLevel || 1]}</p>
                            </div>
                            <Icon.arrow className="w-6 h-6 text-red-400 flex-shrink-0" />
                            <div className="text-center flex-1">
                                <p className="text-[10px] text-white/30 mb-1">TO</p>
                                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{toAuth}</p>
                            </div>
                        </div>

                        {nextLevel > 4 ? (
                            <p className="text-center text-red-400 py-4">Already at maximum escalation level.</p>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2.5"
                                        style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        Reason for Escalation *
                                    </label>
                                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={5}
                                        placeholder={`Why is this complaint being escalated to ${toAuth}?\n\nE.g. No response from Local Office in 7 days. Issue is causing public inconvenience and requires immediate attention at a higher level.`}
                                        className="w-full rounded-2xl px-4 py-3 text-sm text-white resize-none outline-none"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif" }} />
                                </div>
                                <p className="text-xs text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    📄 A formal government-style letter will be auto-generated and attached to this complaint.
                                </p>
                                <motion.button whileTap={{ scale: 0.97 }} onClick={handleEscalate}
                                    disabled={saving || !reason.trim()}
                                    className="w-full py-3.5 rounded-2xl font-bold text-sm relative overflow-hidden group disabled:opacity-50">
                                    <span className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500" />
                                    <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                        {saving
                                            ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Escalating…</>
                                            : <>🔺 Escalate to {toAuth}</>}
                                    </span>
                                </motion.button>
                            </>
                        )}
                    </div>
                ) : (
                    // Letter preview
                    <div className="px-7 py-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-emerald-400 text-lg">✅</span>
                            <p className="font-bold text-white">Escalation successful — Letter generated</p>
                        </div>
                        <div className="p-4 rounded-2xl overflow-auto text-xs leading-relaxed whitespace-pre-wrap"
                            style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', maxHeight: 320
                            }}>
                            {letter}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => {
                                const blob = new Blob([letter], { type: 'text/plain' });
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = `escalation-${complaint.complaintId || complaint._id.slice(-6)}.txt`;
                                a.click();
                            }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                                <Icon.download className="w-4 h-4" /> Download Letter
                            </button>
                            <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                                style={{ background: 'rgba(255,255,255,0.06)', fontFamily: "'DM Sans',sans-serif" }}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// ─── Update + Message Modal ───────────────────────────────────────────────────
function DetailModal({ complaint: initialComplaint, onClose, onSave }) {
    const [complaint, setComplaint] = useState(initialComplaint);
    const [tab, setTab] = useState('update'); // update | images | messages | letter
    const [status, setStatus] = useState(initialComplaint.status);
    const [priority, setPriority] = useState(initialComplaint.priority || 'Normal');
    const [feedback, setFeedback] = useState(initialComplaint.adminFeedback || '');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(complaint._id, status, feedback, priority);
        setSaving(false);
        onClose();
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;
        setSending(true);
        try {
            await api.post(`/complaints/${complaint._id}/message`, { text: message });
            const { data } = await api.get(`/complaints/${complaint._id}`);
            setComplaint(data);
            setMessage('');
        } catch (err) { alert('Failed to send message'); }
        finally { setSending(false); }
    };

    const tabs = [
        { key: 'update', label: 'Update', icon: '⚙️' },
        { key: 'images', label: `Images (${complaint.images?.length || 0})`, icon: '📸' },
        { key: 'messages', label: `Thread (${complaint.messages?.length || 0})`, icon: '💬' },
        ...(complaint.escalationLetters?.length ? [{ key: 'letter', label: 'Letters', icon: '📄' }] : []),
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ fontFamily: "'Syne','DM Sans',sans-serif" }} onClick={onClose}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-xl rounded-3xl overflow-hidden"
                style={{ background: 'rgba(10,16,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-7 py-5 flex items-center justify-between sticky top-0 z-10"
                    style={{ background: 'rgba(10,16,30,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-white/30 font-mono">{complaint.complaintId || '—'}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                    background: PRIORITY_CFG[complaint.priority || 'Normal'].bg,
                                    color: PRIORITY_CFG[complaint.priority || 'Normal'].color,
                                    fontFamily: "'DM Sans',sans-serif"
                                }}>
                                {complaint.priority === 'Critical' ? '🔴' : complaint.priority === 'High' ? '🟠' : '⚪'} {complaint.priority || 'Normal'}
                            </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-white truncate max-w-xs">{complaint.title}</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40"
                        style={{ background: 'rgba(255,255,255,0.06)' }}><Icon.x className="w-4 h-4" /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-7 py-3 overflow-x-auto"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                            style={{
                                background: tab === t.key ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'rgba(255,255,255,0.04)',
                                color: tab === t.key ? 'white' : 'rgba(255,255,255,0.4)',
                                fontFamily: "'DM Sans',sans-serif",
                            }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div className="px-7 py-5">

                    {/* ── Update Tab ── */}
                    {tab === 'update' && (
                        <div className="space-y-4">
                            {/* Citizen */}
                            <div className="flex items-center gap-3 p-3 rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>
                                    {complaint.user?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white">{complaint.user?.name || 'Unknown'}</p>
                                    <p className="text-xs text-white/35 truncate" style={{ fontFamily: "'DM Sans',sans-serif" }}>{complaint.user?.email}</p>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                                        style={{ background: complaint.user?.aadhaarVerified ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.1)', color: complaint.user?.aadhaarVerified ? '#10b981' : '#f59e0b', fontFamily: "'DM Sans',sans-serif" }}>
                                        {complaint.user?.aadhaarVerified ? '🪪 Aadhaar Verified' : '⚠️ Not Verified'}
                                    </span>
                                </div>
                                <span className="text-xs text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>{timeAgo(complaint.createdAt)}</span>
                            </div>

                            {/* Description */}
                            <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <p className="text-xs text-white/30 mb-1.5 uppercase tracking-wider"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>Description</p>
                                <p className="text-sm text-white/70 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    {complaint.description}
                                </p>
                            </div>

                            {/* Location */}
                            {complaint.location && (
                                <div className="flex items-start gap-2 text-xs text-white/40" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    <Icon.pin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
                                    <span>{complaint.location}</span>
                                </div>
                            )}

                            {/* Priority */}
                            <div>
                                <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>Priority</label>
                                <div className="flex gap-2">
                                    {['Normal', 'High', 'Critical'].map(p => (
                                        <button key={p} onClick={() => setPriority(p)}
                                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                                            style={{
                                                background: priority === p ? PRIORITY_CFG[p].bg : 'rgba(255,255,255,0.03)',
                                                color: priority === p ? PRIORITY_CFG[p].color : 'rgba(255,255,255,0.3)',
                                                border: `1px solid ${priority === p ? PRIORITY_CFG[p].color + '40' : 'rgba(255,255,255,0.06)'}`,
                                                fontFamily: "'DM Sans',sans-serif",
                                            }}>
                                            {p === 'Critical' ? '🔴' : p === 'High' ? '🟠' : '⚪'} {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(STATUS_CFG).map(([s, cfg]) => (
                                        <button key={s} onClick={() => setStatus(s)}
                                            className="py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                                            style={{
                                                background: status === s ? cfg.bg : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${status === s ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                                                color: status === s ? cfg.color : 'rgba(255,255,255,0.4)',
                                                fontFamily: "'DM Sans',sans-serif",
                                            }}>
                                            {status === s && <Icon.check className="w-3 h-3 flex-shrink-0" />}
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback */}
                            <div>
                                <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>Official Response</label>
                                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4}
                                    placeholder="Write your official response to the citizen..."
                                    className="w-full rounded-2xl px-4 py-3 text-sm text-white resize-none outline-none"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif" }} />
                            </div>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                                className="w-full py-3.5 rounded-2xl font-bold text-sm relative overflow-hidden group disabled:opacity-60">
                                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                    {saving
                                        ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
                                        : <><Icon.send className="w-4 h-4" /> Save & Notify Citizen</>}
                                </span>
                            </motion.button>
                        </div>
                    )}

                    {/* ── Images Tab ── */}
                    {tab === 'images' && (
                        <div>
                            {(!complaint.images || complaint.images.length === 0) ? (
                                <div className="text-center py-16">
                                    <p className="text-4xl mb-3">📭</p>
                                    <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>No images attached to this complaint</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        {complaint.images.length} evidence photo{complaint.images.length > 1 ? 's' : ''} submitted by citizen
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {complaint.images.map((img, i) => (
                                            <motion.div key={i} whileHover={{ scale: 1.02 }} onClick={() => { setGalleryOpen(true); }}
                                                className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer"
                                                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <img src={`${BASE_URL}${img}`} alt={`Evidence ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                    onError={e => { e.target.style.display = 'none'; e.target.parentNode.style.background = 'rgba(255,255,255,0.05)'; }}
                                                    crossOrigin="anonymous"
                                                />
                                                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 hover:opacity-100 text-white text-xs font-semibold">View Full</span>
                                                </div>
                                                <div className="absolute bottom-2 left-2 text-[10px] text-white/60 px-1.5 py-0.5 rounded"
                                                    style={{ background: 'rgba(0,0,0,0.5)' }}>Photo {i + 1}</div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <button onClick={() => setGalleryOpen(true)}
                                        className="w-full py-3 rounded-2xl text-sm font-semibold text-center transition-all"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans',sans-serif"
                                        }}>
                                        🔍 View Full Screen Gallery
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Messages Tab ── */}
                    {tab === 'messages' && (
                        <div className="space-y-4">
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {(!complaint.messages || complaint.messages.length === 0) ? (
                                    <p className="text-center text-white/30 text-sm py-8" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        No messages yet. Start the conversation.
                                    </p>
                                ) : complaint.messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className="max-w-[80%] px-4 py-3 rounded-2xl"
                                            style={{
                                                background: msg.senderRole === 'admin' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                                                border: `1px solid ${msg.senderRole === 'admin' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                            }}>
                                            <p className="text-xs font-semibold mb-1" style={{ color: msg.senderRole === 'admin' ? '#10b981' : 'rgba(255,255,255,0.5)' }}>
                                                {msg.senderRole === 'admin' ? '🏛️ Authority' : '🧑‍💼 Citizen'}
                                            </p>
                                            <p className="text-sm text-white/80" style={{ fontFamily: "'DM Sans',sans-serif" }}>{msg.text}</p>
                                            <p className="text-[10px] text-white/25 mt-1 text-right" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                {timeAgo(msg.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input value={message} onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder="Type a message to citizen..."
                                    className="flex-1 px-4 py-3 rounded-2xl text-sm text-white outline-none"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif" }} />
                                <motion.button whileTap={{ scale: 0.9 }} onClick={handleSendMessage} disabled={sending || !message.trim()}
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>
                                    <Icon.send className="w-4 h-4 text-white" />
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {/* ── Escalation Letters Tab ── */}
                    {tab === 'letter' && (
                        <div className="space-y-4">
                            {complaint.escalationLetters?.map((letter, i) => (
                                <div key={i} className="rounded-2xl overflow-hidden"
                                    style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <div className="px-4 py-3 flex items-center justify-between"
                                        style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
                                        <div>
                                            <p className="text-sm font-bold text-white">Level {letter.level} — {letter.toAuthority}</p>
                                            <p className="text-xs text-white/35" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                {new Date(letter.escalatedAt).toLocaleDateString('en-IN')}
                                            </p>
                                        </div>
                                        <button onClick={() => {
                                            const blob = new Blob([letter.letterText], { type: 'text/plain' });
                                            const a = document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            a.download = `escalation-level${letter.level}.txt`;
                                            a.click();
                                        }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                                            <Icon.download className="w-3 h-3" /> Download
                                        </button>
                                    </div>
                                    <div className="p-4 text-xs leading-relaxed whitespace-pre-wrap overflow-auto"
                                        style={{
                                            color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', maxHeight: 200,
                                            background: 'rgba(255,255,255,0.02)'
                                        }}>
                                        {letter.letterText}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {galleryOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
                    <ImageGallery images={complaint.images} onClose={() => setGalleryOpen(false)} />
                </div>
            )}
        </div>
    );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [catFilter, setCatFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('complaints');
    const [selected, setSelected] = useState(null);
    const [escalating, setEscalating] = useState(null);

    useEffect(() => { if (user && user.role !== 'admin') navigate('/citizen'); }, [user]);
    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [cRes, uRes] = await Promise.all([api.get('/complaints'), api.get('/auth/admin/users')]);
            setComplaints(cRes.data);
            setUsers(uRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (id, status, adminFeedback, priority) => {
        try {
            const { data } = await api.put(`/complaints/${id}`, { status, adminFeedback, priority });
            setComplaints(prev => prev.map(c => c._id === id ? data : c));
        } catch (err) { console.error(err); }
    };

    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'Pending').length,
        inProgress: complaints.filter(c => c.status === 'In Progress').length,
        resolved: complaints.filter(c => c.status === 'Resolved').length,
        critical: complaints.filter(c => c.priority === 'Critical').length,
        citizens: users.filter(u => u.role === 'citizen').length,
    };

    // ── Analytics data ──
    const catData = ['Infrastructure', 'Corruption', 'Scam', 'Public Service'].map(cat => ({
        name: cat.split(' ')[0], value: complaints.filter(c => c.category === cat).length,
    }));
    const statusData = Object.keys(STATUS_CFG).map(s => ({
        name: s, value: complaints.filter(c => c.status === s).length,
    }));
    // Complaints over last 7 days
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 6 + i);
        const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const count = complaints.filter(c => {
            const cd = new Date(c.createdAt);
            return cd.toDateString() === d.toDateString();
        }).length;
        return { name: label, complaints: count };
    });

    const filtered = complaints.filter(c => {
        const ms = !search || c.title?.toLowerCase().includes(search.toLowerCase())
            || c.user?.name?.toLowerCase().includes(search.toLowerCase())
            || c.location?.toLowerCase().includes(search.toLowerCase())
            || c.complaintId?.toLowerCase().includes(search.toLowerCase());
        const mSt = statusFilter === 'all' || c.status === statusFilter;
        const mCt = catFilter === 'all' || c.category === catFilter;
        return ms && mSt && mCt;
    });

    const exportCSV = () => {
        const rows = [['ID', 'Title', 'Category', 'Status', 'Priority', 'Location', 'Citizen', 'Filed', 'Feedback']];
        filtered.forEach(c => rows.push([
            c.complaintId || c._id?.slice(-6), `"${c.title}"`, c.category, c.status, c.priority || 'Normal',
            `"${c.location || ''}"`, `"${c.user?.name || ''}"`,
            new Date(c.createdAt).toLocaleDateString('en-IN'), `"${c.adminFeedback || ''}"`
        ]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `civicconnect_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const tooltipStyle = {
        contentStyle: { background: '#0d1825', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white' },
        labelStyle: { color: 'rgba(255,255,255,0.5)' },
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#03070f' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-10 h-10 border-2 border-white/10 border-t-emerald-400 rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen" style={{ background: '#03070f', fontFamily: "'Syne','DM Sans',sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(16,185,129,0.4);border-radius:99px}
      `}</style>

            {/* Background glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-8"
                    style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)', filter: 'blur(60px)' }} />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-6"
                    style={{ background: 'radial-gradient(circle,#3b82f6,transparent 70%)', filter: 'blur(80px)' }} />
            </div>

            {/* Navbar */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
                style={{ background: 'rgba(3,7,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
                        style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>⚡</div>
                    <div>
                        <p className="text-sm font-extrabold text-white">CivicConnect</p>
                        <p className="text-[10px] text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>Authority Portal</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-xs text-emerald-400 font-semibold">Admin: {user?.name?.split(' ')[0]}</span>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { logout(); navigate('/login'); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                    style={{ fontFamily: "'DM Sans',sans-serif" }}>
                    <Icon.logout className="w-4 h-4" /> Logout
                </motion.button>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                        Authority{' '}
                        <span style={{
                            background: 'linear-gradient(135deg,#10b981,#3b82f6)', WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                        }}>Command Centre</span>
                    </h1>
                    <p className="text-white/35 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        Manage grievances · Escalate complaints · Track resolutions
                    </p>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Total', value: stats.total, color: '#3b82f6', icon: <span className="text-xl">📋</span> },
                        { label: 'Pending', value: stats.pending, color: '#f59e0b', icon: <span className="text-xl">⏳</span> },
                        { label: 'In Progress', value: stats.inProgress, color: '#8b5cf6', icon: <span className="text-xl">⚙️</span> },
                        {
                            label: 'Resolved', value: stats.resolved, color: '#10b981', icon: <span className="text-xl">✅</span>,
                            sub: stats.total ? `${Math.round(stats.resolved / stats.total * 100)}%` : null
                        },
                        { label: 'Critical', value: stats.critical, color: '#ef4444', icon: <span className="text-xl">🔴</span> },
                        { label: 'Citizens', value: stats.citizens, color: '#06b6d4', icon: <span className="text-xl">👥</span> },
                    ].map((s, i) => <StatCard key={s.label} delay={i * 0.05} {...s} />)}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl w-fit"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                        { key: 'complaints', label: `Complaints (${complaints.length})` },
                        { key: 'analytics', label: 'Analytics 📊' },
                        { key: 'users', label: `Citizens (${users.length})` },
                        { key: 'pending', label: `Pending Approvals ${users.filter(u => u.role === 'admin' && !u.isApproved).length > 0 ? '🔴' : ''}(${users.filter(u => u.role === 'admin' && !u.isApproved).length})` },
                    ].map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                            style={{
                                background: activeTab === t.key ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'transparent',
                                color: activeTab === t.key ? 'white' : 'rgba(255,255,255,0.4)',
                                fontFamily: "'DM Sans',sans-serif",
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* ── COMPLAINTS TAB ── */}
                    {activeTab === 'complaints' && (
                        <motion.div key="c" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Filters */}
                            <div className="flex flex-col lg:flex-row gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Icon.search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by title, citizen, location, complaint ID..."
                                        className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/25 outline-none"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif" }} />
                                </div>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                    className="px-4 py-3 rounded-2xl text-sm text-white outline-none cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif", minWidth: 160 }}>
                                    <option value="all" style={{ background: '#0d1825' }}>All Statuses</option>
                                    {Object.keys(STATUS_CFG).map(s => <option key={s} value={s} style={{ background: '#0d1825' }}>{s}</option>)}
                                </select>
                                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                                    className="px-4 py-3 rounded-2xl text-sm text-white outline-none cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif", minWidth: 180 }}>
                                    <option value="all" style={{ background: '#0d1825' }}>All Categories</option>
                                    {Object.keys(CAT_ICONS).map(c => <option key={c} value={c} style={{ background: '#0d1825' }}>{CAT_ICONS[c]} {c}</option>)}
                                </select>
                                <motion.button whileTap={{ scale: 0.97 }} onClick={exportCSV}
                                    className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap"
                                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                                    <Icon.download className="w-4 h-4" /> Export CSV
                                </motion.button>
                            </div>

                            <p className="text-xs text-white/25 mb-4" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                Showing {filtered.length} of {complaints.length} complaints
                            </p>

                            {/* Table header */}
                            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 mb-2 text-[11px] font-semibold text-white/25 uppercase tracking-widest"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                <div className="col-span-1">ID</div>
                                <div className="col-span-3">Complaint</div>
                                <div className="col-span-2">Citizen</div>
                                <div className="col-span-1">Cat</div>
                                <div className="col-span-1">Priority</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-1">Imgs</div>
                                <div className="col-span-1">Filed</div>
                                <div className="col-span-1">Actions</div>
                            </div>

                            <div className="space-y-2">
                                {filtered.length === 0 ? (
                                    <div className="text-center py-16 rounded-3xl"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p className="text-4xl mb-3">🔍</p>
                                        <p className="text-white/40 text-sm">No complaints match your filters</p>
                                    </div>
                                ) : filtered.map((c, i) => {
                                    const cfg = STATUS_CFG[c.status] || STATUS_CFG['Pending'];
                                    const pcfg = PRIORITY_CFG[c.priority || 'Normal'];
                                    return (
                                        <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.025 }}
                                            className="group grid grid-cols-2 lg:grid-cols-12 gap-3 items-center px-5 py-4 rounded-2xl transition-all"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>

                                            <div className="hidden lg:block col-span-1 text-[10px] text-white/25 font-mono">
                                                {c.complaintId || c._id?.slice(-4).toUpperCase()}
                                            </div>
                                            <div className="col-span-2 lg:col-span-3">
                                                <p className="text-sm font-bold text-white truncate">{c.title}</p>
                                                <p className="text-[11px] text-white/30 truncate mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                    {c.description?.slice(0, 50)}…
                                                </p>
                                            </div>
                                            <div className="hidden lg:flex col-span-2 items-center gap-2">
                                                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>
                                                    {c.user?.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <p className="text-xs text-white/60 truncate">{c.user?.name || '—'}</p>
                                            </div>
                                            <div className="hidden lg:block col-span-1 text-center text-base">{CAT_ICONS[c.category] || '📋'}</div>
                                            <div className="hidden lg:block col-span-1">
                                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                                                    style={{ background: pcfg.bg, color: pcfg.color, fontFamily: "'DM Sans',sans-serif" }}>
                                                    {c.priority === 'Critical' ? '🔴' : c.priority === 'High' ? '🟠' : '⚪'} {c.priority || 'Normal'}
                                                </span>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                                                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontFamily: "'DM Sans',sans-serif" }}>
                                                    {c.status}
                                                </span>
                                            </div>
                                            <div className="hidden lg:flex col-span-1 items-center gap-1 text-xs text-white/30">
                                                {c.images?.length > 0 ? (
                                                    <span className="text-emerald-400 font-semibold">📸 {c.images.length}</span>
                                                ) : <span>—</span>}
                                            </div>
                                            <div className="hidden lg:block col-span-1 text-[11px] text-white/30"
                                                style={{ fontFamily: "'DM Sans',sans-serif" }}>{timeAgo(c.createdAt)}</div>
                                            <div className="col-span-1 lg:col-span-1 flex items-center gap-1.5">
                                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSelected(c)}
                                                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl"
                                                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                                                    Edit
                                                </motion.button>
                                                {c.escalationLevel < 4 && c.status !== 'Resolved' && (
                                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEscalating(c)}
                                                        title="Escalate to higher authority"
                                                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl"
                                                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontFamily: "'DM Sans',sans-serif" }}>
                                                        🔺
                                                    </motion.button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* ── ANALYTICS TAB ── */}
                    {activeTab === 'analytics' && (
                        <motion.div key="a" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-6">

                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Complaints over time */}
                                <div className="rounded-3xl p-6"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 className="text-base font-bold text-white mb-1">Complaints This Week</h3>
                                    <p className="text-xs text-white/30 mb-5" style={{ fontFamily: "'DM Sans',sans-serif" }}>Daily volume over last 7 days</p>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={last7}>
                                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <Tooltip {...tooltipStyle} />
                                            <Bar dataKey="complaints" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                                            <defs>
                                                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" />
                                                    <stop offset="100%" stopColor="#3b82f6" />
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Status breakdown */}
                                <div className="rounded-3xl p-6"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 className="text-base font-bold text-white mb-1">Status Breakdown</h3>
                                    <p className="text-xs text-white/30 mb-5" style={{ fontFamily: "'DM Sans',sans-serif" }}>Distribution across all complaints</p>
                                    <div className="flex items-center gap-4">
                                        <ResponsiveContainer width="50%" height={160}>
                                            <PieChart>
                                                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                                                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                                </Pie>
                                                <Tooltip {...tooltipStyle} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex-1 space-y-2.5">
                                            {statusData.map((s, i) => (
                                                <div key={s.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                                                        <span className="text-xs text-white/50" style={{ fontFamily: "'DM Sans',sans-serif" }}>{s.name}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-white">{s.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Category breakdown */}
                                <div className="rounded-3xl p-6"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 className="text-base font-bold text-white mb-1">By Category</h3>
                                    <p className="text-xs text-white/30 mb-5" style={{ fontFamily: "'DM Sans',sans-serif" }}>Which types of complaints are most common</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={catData} layout="vertical">
                                            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                                            <Tooltip {...tooltipStyle} />
                                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Resolution rate card */}
                                <div className="rounded-3xl p-6 flex flex-col justify-between"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div>
                                        <h3 className="text-base font-bold text-white mb-1">Resolution Rate</h3>
                                        <p className="text-xs text-white/30 mb-6" style={{ fontFamily: "'DM Sans',sans-serif" }}>Overall performance</p>
                                    </div>
                                    <div className="text-center py-4">
                                        <p className="text-7xl font-extrabold mb-2"
                                            style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                            {stats.total ? Math.round(stats.resolved / stats.total * 100) : 0}%
                                        </p>
                                        <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                            {stats.resolved} resolved out of {stats.total} total
                                        </p>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <motion.div className="h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.total ? stats.resolved / stats.total * 100 : 0}%` }}
                                            transition={{ duration: 1.2, ease: 'easeOut' }}
                                            style={{ background: 'linear-gradient(90deg,#10b981,#3b82f6)' }} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── CITIZENS TAB ── */}
                    {activeTab === 'users' && (
                        <motion.div key="u" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-2">
                            {users.map((u, i) => (
                                <motion.div key={u._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-center px-5 py-4 rounded-2xl"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="col-span-2 lg:col-span-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>
                                            {u.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{u.name}</p>
                                            <p className="text-[11px] text-white/35 truncate" style={{ fontFamily: "'DM Sans',sans-serif" }}>{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="hidden lg:block col-span-3">
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                                            style={{
                                                background: u.role === 'admin' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.1)',
                                                color: u.role === 'admin' ? '#8b5cf6' : '#3b82f6', fontFamily: "'DM Sans',sans-serif"
                                            }}>
                                            {u.role === 'admin' ? '🏛️ Admin' : '🧑‍💼 Citizen'}
                                        </span>
                                    </div>
                                    <div className="col-span-1 lg:col-span-2">
                                        {u.aadhaarVerified
                                            ? <span className="text-xs font-semibold px-2 py-1 rounded-full"
                                                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>🪪 Verified</span>
                                            : <span className="text-xs font-semibold px-2 py-1 rounded-full"
                                                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontFamily: "'DM Sans',sans-serif" }}>⏳ Pending</span>}
                                    </div>
                                    <div className="hidden lg:block col-span-2 text-xs text-white/25"
                                        style={{ fontFamily: "'DM Sans',sans-serif" }}>{timeAgo(u.createdAt)}</div>
                                    <div className="hidden lg:block col-span-1 text-xs text-white/25 text-right"
                                        style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        {complaints.filter(c => c.user?._id === u._id || c.user === u._id).length} complaints
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                    {/* ── PENDING APPROVALS TAB ── */}
                    {activeTab === 'pending' && (
                        <motion.div key="p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-3">
                            {users.filter(u => u.role === 'admin' && !u.isApproved).length === 0 ? (
                                <div className="text-center py-20 rounded-3xl"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="text-4xl mb-3">✅</p>
                                    <p className="text-white/40 text-sm">No pending admin approvals</p>
                                </div>
                            ) : users.filter(u => u.role === 'admin' && !u.isApproved).map((u, i) => (
                                <motion.div key={u._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                                    style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>
                                        {u.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white">{u.name}</p>
                                        <p className="text-xs text-white/40" style={{ fontFamily: "'DM Sans',sans-serif" }}>{u.email}</p>
                                        <p className="text-[10px] text-amber-400/60 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                            Registered {new Date(u.createdAt).toLocaleDateString('en-IN')} · Awaiting approval
                                        </p>
                                    </div>
                                    <motion.button whileTap={{ scale: 0.95 }}
                                        onClick={async () => {
                                            try {
                                                await api.post(`/auth/admin/approve/${u._id}`);
                                                const { data } = await api.get('/auth/admin/users');
                                                setUsers(data);
                                            } catch (err) { alert(err.response?.data?.message || 'Failed'); }
                                        }}
                                        className="px-4 py-2 rounded-xl text-xs font-bold"
                                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                                        ✅ Approve
                                    </motion.button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {selected && (
                    <DetailModal complaint={selected} onClose={() => setSelected(null)} onSave={handleUpdate} />
                )}
                {escalating && (
                    <EscalateModal complaint={escalating} onClose={() => setEscalating(null)}
                        onEscalated={(updated) => {
                            setComplaints(prev => prev.map(c => c._id === updated._id ? updated : c));
                            setEscalating(null);
                        }} />
                )}
            </AnimatePresence>
        </div>
    );
}