import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EscalationTimeline from './EscalationTimeline';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
    'Pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: '⏳', label: 'Pending' },
    'In Progress': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', icon: '⚙️', label: 'In Progress' },
    'Resolved': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', icon: '✅', label: 'Resolved' },
    'Rejected': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', icon: '❌', label: 'Rejected' },
};

const CATEGORY_ICONS = {
    'Infrastructure': '🏗️',
    'Corruption': '⚖️',
    'Scam': '🚨',
    'Public Service': '🏛️',
};

function timeAgo(dateStr) {
    if (!dateStr) return 'Recently';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatHistoryDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'AM' : 'PM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
}

// ─── Chat Thread (Citizen Side) ───────────────────────────────────────────────
function ChatThread({ complaint: initial }) {
    const [complaint, setComplaint] = useState(initial);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [reopenDone, setReopenDone] = useState(initial.chatReopenRequested || false);
    const bottomRef = useRef(null);

    // Scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [complaint.messages]);

    // Poll for new messages every 8s when chat is open
    useEffect(() => {
        if (!complaint.chatEnabled) return;
        const id = setInterval(async () => {
            try {
                const { data } = await api.get(`/complaints/${complaint._id}`);
                setComplaint(data);
            } catch (_) { }
        }, 8000);
        return () => clearInterval(id);
    }, [complaint.chatEnabled, complaint._id]);

    const sendMessage = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await api.post(`/complaints/${complaint._id}/message`, { text: text.trim() });
            const { data } = await api.get(`/complaints/${complaint._id}`);
            setComplaint(data);
            setText('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send message');
        } finally { setSending(false); }
    };

    const requestReopen = async () => {
        setRequesting(true);
        try {
            await api.post(`/complaints/${complaint._id}/request-reopen`);
            setReopenDone(true);
            setComplaint(prev => ({ ...prev, chatReopenRequested: true }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send request');
        } finally { setRequesting(false); }
    };

    // ── Thread Closed State ───────────────────────────────────────────────────
    if (!complaint.chatEnabled) {
        return (
            <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3"
                    style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs font-bold text-red-400 flex-1"
                        style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        Official Communication Thread — Closed
                    </p>
                    <span className="text-[10px] text-white/25 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', fontFamily: "'DM Sans',sans-serif" }}>
                        🔒 Read Only
                    </span>
                </div>

                {/* Show existing messages if any */}
                {complaint.messages?.length > 0 && (
                    <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                        {complaint.messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.senderRole === 'admin' ? 'justify-start' : 'justify-end'}`}>
                                <div className="max-w-[85%] px-3 py-2 rounded-xl"
                                    style={{
                                        background: msg.senderRole === 'admin' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                                        border: `1px solid ${msg.senderRole === 'admin' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                    }}>
                                    <p className="text-[10px] font-semibold mb-1"
                                        style={{ color: msg.senderRole === 'admin' ? '#10b981' : 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans',sans-serif" }}>
                                        {msg.senderRole === 'admin' ? '🏛️ Authority' : 'You'}
                                    </p>
                                    <p className="text-xs text-white/70" style={{ fontFamily: "'DM Sans',sans-serif" }}>{msg.text}</p>
                                    <p className="text-[9px] text-white/20 mt-1 text-right" style={{ fontFamily: "'DM Sans',sans-serif" }}>{timeAgo(msg.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Closed footer */}
                <div className="px-4 py-4 flex items-center justify-between gap-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-xs text-white/30 flex-1" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        {reopenDone || complaint.chatReopenRequested
                            ? '⏳ Reopen request sent to authority. Awaiting response.'
                            : 'This thread has been closed by the authority. You may request to reopen it.'}
                    </p>
                    {!reopenDone && !complaint.chatReopenRequested && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={requestReopen} disabled={requesting}
                            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                            style={{
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.25)',
                                color: '#3b82f6',
                                fontFamily: "'DM Sans',sans-serif",
                            }}>
                            {requesting ? '⏳ Sending…' : '📨 Request Reopen'}
                        </motion.button>
                    )}
                </div>
            </div>
        );
    }

    // ── Thread Open State ─────────────────────────────────────────────────────
    return (
        <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.03)' }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3"
                style={{ borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
                    className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <p className="text-xs font-bold text-emerald-400 flex-1"
                    style={{ fontFamily: "'DM Sans',sans-serif" }}>
                    Official Communication Thread — Open
                </p>
                <span className="text-[10px] text-emerald-400/50 px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.08)', fontFamily: "'DM Sans',sans-serif" }}>
                    🔓 Live
                </span>
            </div>

            {/* Messages */}
            <div className="px-4 py-3 space-y-2 max-h-56 overflow-y-auto">
                {(!complaint.messages || complaint.messages.length === 0) ? (
                    <div className="text-center py-6">
                        <p className="text-xs text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                            Authority has opened this thread. Send your message below.
                        </p>
                    </div>
                ) : complaint.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.senderRole === 'admin' ? 'justify-start' : 'justify-end'}`}>
                        <div className="max-w-[85%] px-3 py-2.5 rounded-2xl"
                            style={{
                                background: msg.senderRole === 'admin' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                border: `1px solid ${msg.senderRole === 'admin' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}`,
                            }}>
                            <p className="text-[10px] font-bold mb-1"
                                style={{ color: msg.senderRole === 'admin' ? '#10b981' : '#3b82f6', fontFamily: "'DM Sans',sans-serif" }}>
                                {msg.senderRole === 'admin' ? '🏛️ Authority' : 'You'}
                            </p>
                            <p className="text-xs text-white/80 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>{msg.text}</p>
                            <p className="text-[9px] text-white/20 mt-1 text-right" style={{ fontFamily: "'DM Sans',sans-serif" }}>{timeAgo(msg.createdAt)}</p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex gap-2"
                style={{ borderTop: '1px solid rgba(16,185,129,0.1)' }}>
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type your official message…"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontFamily: "'DM Sans',sans-serif",
                    }}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage}
                    disabled={sending || !text.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>
                    {sending
                        ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full block" />
                        : <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    }
                </motion.button>
            </div>
        </div>
    );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ complaintId, onRated }) {
    const [hovered, setHovered] = useState(0);
    const [selected, setSelected] = useState(0);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await api.post(`/complaints/${complaintId}/rate`, { rating: selected, ratingComment: comment });
            setDone(true);
            onRated?.();
        } catch (err) {
            alert(err.response?.data?.message || 'Rating failed');
        } finally { setSaving(false); }
    };

    if (done) return (
        <div className="text-center py-3">
            <p className="text-emerald-400 text-sm font-bold" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                ✅ Thank you for your feedback!
            </p>
        </div>
    );

    return (
        <div className="p-4 rounded-2xl space-y-3"
            style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest"
                style={{ fontFamily: "'DM Sans',sans-serif" }}>Rate Resolution</p>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                    <button key={star}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setSelected(star)}
                        className="text-2xl transition-transform hover:scale-110">
                        {star <= (hovered || selected) ? '⭐' : '☆'}
                    </button>
                ))}
            </div>
            <input value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Optional: add a comment..."
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif" }} />
            <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={!selected || saving}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 relative overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                <span className="relative z-10">{saving ? 'Submitting…' : 'Submit Rating'}</span>
            </motion.button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ComplaintCard({ complaint: initialComplaint, onUpdate }) {
    const [complaint, setComplaint] = useState(initialComplaint);
    const [expanded, setExpanded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [showRating, setShowRating] = useState(false);

    // Refresh complaint data when expanded
    useEffect(() => {
        if (!expanded) return;
        api.get(`/complaints/${complaint._id}`)
            .then(({ data }) => setComplaint(data))
            .catch(() => { });
    }, [expanded]);

    if (!complaint) return null;

    const status = STATUS[complaint.status] || STATUS['Pending'];
    const catIcon = CATEGORY_ICONS[complaint.category] || '📋';
    const isEscalated = complaint.escalationLevel > 1;
    const hasImages = complaint.images?.length > 0;
    const hasLocation = complaint.city || complaint.location;

    return (
        <motion.div layout
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-2xl overflow-hidden cursor-pointer"
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${expanded ? status.border : 'rgba(255,255,255,0.08)'}`,
                backdropFilter: 'blur(16px)',
                fontFamily: "'Syne','DM Sans',sans-serif",
                transition: 'border-color 0.25s ease',
            }}
            onClick={() => setExpanded(!expanded)}>

            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl transition-all duration-300"
                style={{ background: expanded ? `linear-gradient(180deg,${status.color},transparent)` : 'transparent' }} />

            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 0% 50%,${status.color}0a,transparent 60%)` }} />

            {/* ── MAIN ROW ── */}
            <div className="relative p-5">
                <div className="flex items-start gap-4">
                    {/* Image or icon */}
                    <div className="flex-shrink-0">
                        {hasImages && !imgError ? (
                            <div className="relative w-14 h-14 rounded-2xl overflow-hidden"
                                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={`${BASE_URL}${complaint.images[0]}`} alt="Complaint"
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)} />
                                {complaint.images.length > 1 && (
                                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg flex items-center justify-center text-[9px] font-bold text-white"
                                        style={{ background: 'rgba(0,0,0,0.7)' }}>
                                        +{complaint.images.length - 1}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                style={{ background: `${status.color}12`, border: `1px solid ${status.color}25` }}>
                                {catIcon}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-base font-bold text-white leading-tight truncate">
                                {complaint.title || 'Untitled Complaint'}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isEscalated && (
                                    <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                                        🔺 L{complaint.escalationLevel}
                                    </motion.span>
                                )}
                                {/* Chat indicator */}
                                {complaint.chatEnabled && (
                                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                                        💬 Chat Open
                                    </motion.span>
                                )}
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                    style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                                    {status.icon} {status.label}
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-white/45 leading-relaxed line-clamp-2 mb-3"
                            style={{ fontFamily: "'DM Sans',sans-serif" }}>
                            {complaint.description || 'No description provided.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[11px] text-white/40 px-2 py-0.5 rounded-lg font-medium"
                                style={{ background: 'rgba(255,255,255,0.05)', fontFamily: "'DM Sans',sans-serif" }}>
                                {complaint.category || 'General'}
                            </span>
                            {hasLocation && (
                                <span className="text-[11px] text-white/40 flex items-center gap-1"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    📍 {complaint.city || complaint.location}{complaint.district ? `, ${complaint.district}` : ''}
                                </span>
                            )}
                            <span className="text-[11px] text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                🕐 {timeAgo(complaint.createdAt)}
                            </span>
                            {hasImages && (
                                <span className="text-[11px] text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    📸 {complaint.images.length} photo{complaint.images.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Chevron */}
                    <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}
                        className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center self-center"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </motion.div>
                </div>

                {complaint.status === 'In Progress' && (
                    <div className="mt-4 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }}
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }} />
                    </div>
                )}
            </div>

            {/* ── EXPANDED SECTION ── */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div key="expanded"
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                        onClick={e => e.stopPropagation()}>

                        <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                            {/* Full description */}
                            <div className="mb-5 pt-4">
                                <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>Full Description</p>
                                <p className="text-sm text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    {complaint.description}
                                </p>
                            </div>

                            {/* Image gallery */}
                            {hasImages && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3"
                                        style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        Evidence ({complaint.images.length})
                                    </p>
                                    <div className="flex gap-3 flex-wrap">
                                        {complaint.images.map((img, i) => (
                                            <motion.div key={i} whileHover={{ scale: 1.04 }}
                                                className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                                                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <img src={`${BASE_URL}${img}`} alt={`Evidence ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                    onError={e => e.target.parentNode.style.display = 'none'} />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Details grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                                {[
                                    { label: 'Category', value: complaint.category || 'General', icon: catIcon },
                                    { label: 'Status', value: complaint.status || 'Pending', icon: status.icon },
                                    { label: 'Filed on', value: new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), icon: '📅' },
                                    { label: 'Location', value: hasLocation ? `${complaint.city || complaint.location}${complaint.district ? `, ${complaint.district}` : ''}` : 'Not specified', icon: '📍' },
                                    { label: 'Complaint ID', value: complaint.complaintId || `#${complaint._id?.slice(-6).toUpperCase()}`, icon: '🔖' },
                                    { label: 'Escalation', value: isEscalated ? `Level ${complaint.escalationLevel}` : 'None', icon: isEscalated ? '🔺' : '✅' },
                                ].map(d => (
                                    <div key={d.label} className="rounded-xl p-3"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider"
                                            style={{ fontFamily: "'DM Sans',sans-serif" }}>{d.label}</p>
                                        <p className="text-xs font-semibold text-white/70 flex items-center gap-1.5 truncate"
                                            style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                            <span>{d.icon}</span>{d.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Admin feedback */}
                            {complaint.adminFeedback && (
                                <div className="mb-5 p-4 rounded-2xl"
                                    style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <p className="text-xs font-semibold text-blue-400 mb-2">🏛️ Official Response</p>
                                    <p className="text-sm text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        {complaint.adminFeedback}
                                    </p>
                                </div>
                            )}

                            {/* Escalation Timeline */}
                            {isEscalated && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4"
                                        style={{ fontFamily: "'DM Sans',sans-serif" }}>Escalation Timeline</p>
                                    <EscalationTimeline escalationLevel={complaint.escalationLevel} status={complaint.status} />
                                </div>
                            )}

                            {/* Activity Timeline */}
                            <div className="mb-5 p-4 rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-4"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>Activity Timeline</p>
                                
                                {!complaint.history || complaint.history.length === 0 ? (
                                    <p className="text-xs text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        No activity available yet.
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-start">
                                        {complaint.history.map((event, i) => (
                                            <div key={i} className="w-full">
                                                {i > 0 && (
                                                    <div className="flex justify-start pl-1.5 py-1 text-white/20 text-xs">
                                                        ↓
                                                    </div>
                                                )}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xs mt-0.5" style={{ color: event.action.includes('Resolved') ? '#10b981' : event.action.includes('Created') ? '#3b82f6' : event.action.includes('Escalated') || event.action.includes('Assigned') ? '#ef4444' : '#f59e0b' }}>●</span>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-white">{event.action}</h4>
                                                        {event.description && (
                                                            <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                                {event.description}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                            {event.performedBy ? `By ${event.performedBy} • ` : ''}{formatHistoryDate(event.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── CHAT THREAD ── */}
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3"
                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    Official Communication Thread
                                </p>
                                <ChatThread complaint={complaint} />
                            </div>

                            {/* Rating */}
                            {complaint.status === 'Resolved' && !complaint.rating && (
                                <div className="mb-5">
                                    {!showRating ? (
                                        <motion.button whileTap={{ scale: 0.97 }}
                                            onClick={() => setShowRating(true)}
                                            className="w-full py-2.5 rounded-xl text-sm font-semibold"
                                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                                            ⭐ Rate This Resolution
                                        </motion.button>
                                    ) : (
                                        <StarRating complaintId={complaint._id} onRated={() => setShowRating(false)} />
                                    )}
                                </div>
                            )}

                            {complaint.rating && (
                                <div className="mb-5 p-3 rounded-xl flex items-center gap-3"
                                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <span className="text-lg">{'⭐'.repeat(complaint.rating)}</span>
                                    <p className="text-xs text-white/50" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        You rated this {complaint.rating}/5{complaint.ratingComment ? ` — "${complaint.ratingComment}"` : ''}
                                    </p>
                                </div>
                            )}

                            {/* Collapse button */}
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans',sans-serif" }}
                                onClick={() => setExpanded(false)}>
                                Collapse ↑
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}