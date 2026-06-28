import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const STATUS_CFG = {
    'Pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '⏳ Pending' },
    'In Progress': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: '⚙️ In Progress' },
    'Resolved': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '✅ Resolved' },
    'Rejected': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '❌ Rejected' },
};
const CAT_CFG = {
    Infrastructure: { icon: '🏗️', color: '#06b6d4' },
    Corruption: { icon: '⚖️', color: '#8b5cf6' },
    Scam: { icon: '🚨', color: '#ef4444' },
    'Public Service': { icon: '🏛️', color: '#10b981' },
};
const LEVELS = ['', 'Local Office', 'Municipal Officer', 'Legislative Assembly', 'Chief Minister'];

function timeAgo(d) {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

// ── Single complaint card for public feed ─────────────────────────────────────
function FeedCard({ c, index }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CFG[c.status] || STATUS_CFG['Pending'];
    const cCfg = CAT_CFG[c.category] || { icon: '📋', color: '#ffffff' };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
            className="rounded-3xl overflow-hidden cursor-pointer group"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => setExpanded(e => !e)}>

            {/* Left accent */}
            <div className="flex">
                <div className="w-1 rounded-l-3xl flex-shrink-0 transition-all duration-300"
                    style={{ background: expanded ? `linear-gradient(180deg,${cCfg.color},${cfg.color})` : 'transparent' }} />

                <div className="flex-1 p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                                style={{ background: `${cCfg.color}18`, border: `1px solid ${cCfg.color}25` }}>
                                {cCfg.icon}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white leading-tight truncate">{c.title}</h3>
                                <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    {c.complaintId && <span className="font-mono mr-2">{c.complaintId}</span>}
                                    📍 {c.city || c.location?.split(',')[0] || 'Unknown'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25`, fontFamily: "'DM Sans',sans-serif" }}>
                                {cfg.label}
                            </span>
                            {c.priority === 'Critical' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontFamily: "'DM Sans',sans-serif" }}>
                                    🔴 Critical
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="text-[13px] text-white/55 leading-relaxed mb-3"
                        style={{
                            fontFamily: "'DM Sans',sans-serif", display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden'
                        }}>
                        {c.description}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-[11px] text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                            <span>👤 {c.user?.name || 'Citizen'}</span>
                            <span>🕐 {timeAgo(c.createdAt)}</span>
                            {c.images?.length > 0 && <span>📸 {c.images.length} photo{c.images.length > 1 ? 's' : ''}</span>}
                            {c.messages?.length > 0 && <span>💬 {c.messages.length}</span>}
                        </div>
                        {c.escalationLevel > 1 && (
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontFamily: "'DM Sans',sans-serif" }}>
                                🔺 Level {c.escalationLevel} — {LEVELS[c.escalationLevel]}
                            </span>
                        )}
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                                <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                                    {/* Images */}
                                    {c.images?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2"
                                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Evidence Photos</p>
                                            <div className="flex gap-2">
                                                {c.images.map((img, i) => (
                                                    <div key={i} className="w-24 h-16 rounded-xl overflow-hidden"
                                                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <img src={`${BASE_URL}${img}`} alt="evidence" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Full location */}
                                    <div className="p-3 rounded-2xl text-[12px] text-white/50"
                                        style={{ background: 'rgba(255,255,255,0.02)', fontFamily: "'DM Sans',sans-serif" }}>
                                        📍 {c.location}
                                    </div>

                                    {/* Official response */}
                                    {c.adminFeedback && (
                                        <div className="p-4 rounded-2xl"
                                            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                            <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest mb-2"
                                                style={{ fontFamily: "'DM Sans',sans-serif" }}>🏛️ Official Response</p>
                                            <p className="text-sm text-white/70 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                {c.adminFeedback}
                                            </p>
                                        </div>
                                    )}

                                    {/* Escalation timeline */}
                                    {c.escalationLevel > 1 && (
                                        <div>
                                            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3"
                                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Escalation Path</p>
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                                {LEVELS.slice(1).map((lvl, i) => {
                                                    const active = i + 1 === c.escalationLevel;
                                                    const passed = i + 1 < c.escalationLevel;
                                                    return (
                                                        <div key={lvl} className="flex items-center gap-2 flex-shrink-0">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs"
                                                                    style={{
                                                                        background: passed || active ? `rgba(16,185,129,0.15)` : 'rgba(255,255,255,0.04)',
                                                                        border: `1px solid ${passed || active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                                        color: active ? '#10b981' : passed ? '#10b981' : 'rgba(255,255,255,0.2)',
                                                                    }}>
                                                                    {passed ? '✓' : active ? '●' : '○'}
                                                                </div>
                                                                <p className="text-[9px] text-white/30 text-center w-16 leading-tight"
                                                                    style={{ color: active ? '#10b981' : 'rgba(255,255,255,0.25)', fontFamily: "'DM Sans',sans-serif" }}>
                                                                    {lvl}
                                                                </p>
                                                            </div>
                                                            {i < 3 && <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rating */}
                                    {c.rating && (
                                        <div className="flex items-center gap-3 p-3 rounded-2xl"
                                            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <svg key={s} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
                                                        style={{ color: s <= c.rating ? '#f59e0b' : 'rgba(255,255,255,0.12)' }}>
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                ))}
                                            </div>
                                            <p className="text-xs text-white/50" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                Citizen rated resolution {c.rating}/5
                                                {c.ratingComment && ` — "${c.ratingComment}"`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PublicFeedPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusF, setStatusF] = useState('all');
    const [catF, setCatF] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        api.get('/complaints')
            .then(r => setComplaints(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = complaints
        .filter(c => c.isPublic !== false)
        .filter(c => {
            const ms = !search
                || c.title?.toLowerCase().includes(search.toLowerCase())
                || c.description?.toLowerCase().includes(search.toLowerCase())
                || c.location?.toLowerCase().includes(search.toLowerCase())
                || c.city?.toLowerCase().includes(search.toLowerCase());
            const mS = statusF === 'all' || c.status === statusF;
            const mC = catF === 'all' || c.category === catF;
            return ms && mS && mC;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === 'escalated') return (b.escalationLevel || 1) - (a.escalationLevel || 1);
            return 0;
        });

    // Summary stats for top bar
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const critical = complaints.filter(c => c.priority === 'Critical').length;

    return (
        <DashboardLayout>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

            <div className="max-w-4xl mx-auto space-y-6" style={{ fontFamily: "'Syne','DM Sans',sans-serif" }}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
                        Public{' '}
                        <span style={{
                            background: 'linear-gradient(135deg,#10b981,#3b82f6)', WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                        }}>
                            Complaint Feed
                        </span>
                    </h1>
                    <p className="text-sm text-white/35" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        All civic complaints filed by citizens — transparent & open
                    </p>
                </motion.div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { v: total, l: 'Total Complaints', c: '#3b82f6' },
                        { v: resolved, l: 'Resolved', c: '#10b981' },
                        { v: critical, l: 'Critical Issues', c: '#ef4444' },
                    ].map(({ v, l, c }, i) => (
                        <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 + i * 0.06 }}
                            className="p-4 rounded-2xl text-center"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-3xl font-extrabold" style={{ color: c }}>{v}</p>
                            <p className="text-[11px] text-white/35 mt-1" style={{ fontFamily: "'DM Sans',sans-serif" }}>{l}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search complaints by title, location..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/20 outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', fontFamily: "'DM Sans',sans-serif" }} />
                    </div>
                    {[
                        {
                            val: statusF, set: setStatusF,
                            opts: [['all', 'All Status'], ...Object.keys(STATUS_CFG).map(s => [s, s])]
                        },
                        {
                            val: catF, set: setCatF,
                            opts: [['all', 'All Types'], ...Object.keys(CAT_CFG).map(c => [c, c])]
                        },
                        {
                            val: sortBy, set: setSortBy,
                            opts: [['newest', 'Newest'], ['oldest', 'Oldest'], ['escalated', 'Escalated']]
                        },
                    ].map((sel, i) => (
                        <select key={i} value={sel.val} onChange={e => sel.set(e.target.value)}
                            className="px-4 py-3 rounded-2xl text-sm text-white outline-none cursor-pointer"
                            style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
                                fontFamily: "'DM Sans',sans-serif", minWidth: 130
                            }}>
                            {sel.opts.map(([v, l]) => (
                                <option key={v} value={v} style={{ background: '#0d1825' }}>{l}</option>
                            ))}
                        </select>
                    ))}
                </div>

                {/* Result count */}
                <p className="text-xs text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                    Showing {filtered.length} complaint{filtered.length !== 1 ? 's' : ''}
                </p>

                {/* Feed */}
                {loading ? (
                    <div className="space-y-3">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="h-24 rounded-3xl animate-pulse"
                                style={{ background: 'rgba(255,255,255,0.04)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 rounded-3xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-5xl mb-3">🔍</p>
                        <p className="text-white/35 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                            No complaints match your search.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((c, i) => <FeedCard key={c._id} c={c} index={i} />)}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}