import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import NewComplaintModal from '../components/NewComplaintModal';
import ComplaintCard from '../components/ComplaintCard';
import EscalationTimeline from '../components/EscalationTimeline';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import api from '../services/api';
import AadhaarVerifyModal from '../components/AadhaarVerifyModal';

// ─── Icons (inline SVG to avoid lucide dependency issues) ─────────────────────
const Icon = {
    file: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    check: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    clock: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    alert: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    trend: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    pin: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    plus: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    bell: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    refresh: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    shield: (p) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
};

// ─── Magnetic Button ──────────────────────────────────────────────────────────
function MagneticButton({ children, className, onClick }) {
    const ref = useRef();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 300, damping: 20 });
    const sy = useSpring(y, { stiffness: 300, damping: 20 });
    return (
        <motion.div ref={ref}
            onMouseMove={(e) => { const r = ref.current.getBoundingClientRect(); x.set((e.clientX - r.left - r.width / 2) * 0.2); y.set((e.clientY - r.top - r.height / 2) * 0.2); }}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ x: sx, y: sy }} className={className} onClick={onClick}>
            {children}
        </motion.div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, trend, color, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="relative group cursor-default rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
        >
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at 50% 0%, ${color}18, transparent 70%)` }} />
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

            <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                        {icon}
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                            style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                            <Icon.trend className="w-3 h-3" />
                            {trend}%
                        </div>
                    )}
                </div>
                <p className="text-4xl font-extrabold text-white tracking-tight mb-1">{value}</p>
                <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
            </div>
        </motion.div>
    );
}

// ─── Filter Tab ───────────────────────────────────────────────────────────────
function FilterTab({ label, active, count, onClick }) {
    return (
        <button onClick={onClick}
            className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
            style={{
                background: active ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.45)',
            }}>
            {label}
            {count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: active ? 'white' : 'rgba(255,255,255,0.4)' }}>
                    {count}
                </span>
            )}
        </button>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="rounded-2xl p-6 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/8" />
                <div className="w-16 h-5 rounded-full bg-white/8" />
            </div>
            <div className="w-12 h-8 rounded-lg bg-white/8 mb-2" />
            <div className="w-24 h-3 rounded bg-white/6" />
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onNew }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-6">
            <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon.file className="w-9 h-9" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">No complaints yet</h3>
            <p className="text-white/35 mb-8 max-w-xs mx-auto text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Your voice matters. File your first complaint and hold leaders accountable.
            </p>
            <MagneticButton onClick={onNew} className="cursor-pointer inline-block">
                <button className="relative overflow-hidden px-6 py-3 rounded-2xl font-semibold text-sm group">
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                        <Icon.plus className="w-4 h-4" /> File a Complaint
                    </span>
                </button>
            </MagneticButton>
        </motion.div>
    );
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CitizenDashboard() {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, inProgress: 0, escalated: 0 });
    const [latestComplaints, setLatestComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [notifOpen, setNotifOpen] = useState(false);
    const [showAadhaar, setShowAadhaar] = useState(false);
    const [currentLocation, setCurrentLocation] = useState('Detecting location...');

    useEffect(() => { fetchDashboardData(); }, []);

    useEffect(() => {
        if (!navigator.geolocation) { setCurrentLocation('Location unavailable'); return; }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const data = await res.json();
                    const city = data.address?.city || data.address?.town || data.address?.village || '';
                    const state = data.address?.state || '';
                    setCurrentLocation(city && state ? `${city}, ${state}` : 'Location found');
                } catch { setCurrentLocation('Location unavailable'); }
            },
            () => setCurrentLocation('Location unavailable')
        );
    }, []);

    const fetchDashboardData = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const [complaintsRes, dashboardRes] = await Promise.all([
                api.get('/complaints/my'),
                api.get('/dashboard/citizen'),
            ]);
            setComplaints(complaintsRes.data);
            const d = dashboardRes.data;
            setStats({
                total: d.total ?? 0,
                resolved: d.resolved ?? 0,
                pending: d.pending ?? 0,
                inProgress: d.inProgress ?? 0,
                escalated: d.escalated ?? 0,
            });
            setLatestComplaints(d.latestComplaints ?? []);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const FILTERS = [
        { key: 'all', label: 'All', count: complaints.length },
        { key: 'pending', label: 'Pending', count: complaints.filter(c => c.status !== 'Resolved').length },
        { key: 'resolved', label: 'Resolved', count: complaints.filter(c => c.status === 'Resolved').length },
        { key: 'escalated', label: 'Escalated', count: complaints.filter(c => c.escalationLevel > 1).length },
    ];

    const filtered = complaints.filter(c => {
        if (filter === 'all') return true;
        if (filter === 'pending') return c.status !== 'Resolved';
        if (filter === 'resolved') return c.status === 'Resolved';
        if (filter === 'escalated') return c.escalationLevel > 1;
        return true;
    });

    const firstName = (user?.name || user?.fullName || 'Citizen').split(' ')[0];

    // ── Skeleton Loading ──
    if (loading) {
        return (
            <DashboardLayout>
                <div className="space-y-8" style={{ fontFamily: "'Syne', 'DM Sans', sans-serif" }}>
                    <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
                    <div className="h-10 w-64 rounded-xl bg-white/6 animate-pulse" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                    <div className="rounded-3xl p-8 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="h-6 w-48 bg-white/8 rounded-xl mb-6" />
                        {[0, 1, 2].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl mb-4" />)}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ fontFamily: "'Syne', 'DM Sans', sans-serif" }}>
                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
          .glass-panel { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
          .card-hover { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
          .card-hover:hover { transform: translateY(-4px); }
        `}</style>

                <div className="space-y-8">

                    {/* ── Header ── */}
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-5">

                        <div>
                            {/* Greeting badge */}
                            <div className="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full mb-4 text-xs text-emerald-400 font-medium">
                                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                {getGreeting()}, {firstName}
                            </div>

                            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
                                Your Civic{' '}
                                <span style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Dashboard
                                </span>
                            </h1>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1.5 text-sm text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    <Icon.pin className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                                    <span>{currentLocation}</span>
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                {user?.aadhaarVerified ? (
                                    <div className="flex items-center gap-1.5 text-sm" style={{ color: '#10b981', fontFamily: "'DM Sans', sans-serif" }}>
                                        <Icon.shield className="w-3.5 h-3.5" />
                                        <span>Aadhaar Verified</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-sm text-amber-400 cursor-pointer hover:text-amber-300 transition-colors"
                                        onClick={() => setShowAadhaar(true)}
                                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        <Icon.alert className="w-3.5 h-3.5" />
                                        <span>Verify Aadhaar →</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* Refresh */}
                            <motion.button
                                onClick={() => fetchDashboardData(true)}
                                whileTap={{ scale: 0.92 }}
                                className="w-10 h-10 glass-panel rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: refreshing ? Infinity : 0, duration: 0.7, ease: 'linear' }}>
                                    <Icon.refresh className="w-4 h-4" />
                                </motion.div>
                            </motion.button>

                            {/* Notifications */}
                            <div className="relative">
                                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setNotifOpen(!notifOpen)}
                                    className="w-10 h-10 glass-panel rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-colors relative">
                                    <Icon.bell className="w-4 h-4" />
                                    {stats.escalated > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                                            {stats.escalated}
                                        </span>
                                    )}
                                </motion.button>
                                <AnimatePresence>
                                    {notifOpen && (
                                        <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.18 }}
                                            className="absolute right-0 top-12 w-72 glass-panel rounded-2xl p-4 z-50 shadow-2xl">
                                            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Notifications</p>
                                            {stats.escalated > 0 ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/8 border border-red-500/15">
                                                        <span className="text-red-400 text-base mt-0.5">⚠</span>
                                                        <div>
                                                            <p className="text-xs font-semibold text-white/80">{stats.escalated} complaint{stats.escalated > 1 ? 's' : ''} escalated</p>
                                                            <p className="text-[10px] text-white/35 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Review and provide additional details</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-white/30 text-center py-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>All clear! No new notifications.</p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* New Complaint CTA */}
                            <MagneticButton className="cursor-pointer">
                                <button onClick={() => user?.aadhaarVerified ? setShowModal(true) : setShowAadhaar(true)}
                                    title={!user?.aadhaarVerified ? 'Verify Aadhaar first' : ''}
                                    className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm group">
                                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Icon.plus className="w-4 h-4" /> New Complaint
                                    </span>
                                </button>
                            </MagneticButton>
                        </div>
                    </motion.div>

                    {/* ── Stats Grid ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                        <StatCard delay={0.05} icon={<Icon.file className="w-5 h-5" style={{ color: '#3b82f6' }} />}
                            label="Total Complaints" value={stats.total} color="#3b82f6" />
                        <StatCard delay={0.1} icon={<Icon.check className="w-5 h-5" style={{ color: '#10b981' }} />}
                            label="Resolved" value={stats.resolved} color="#10b981" />
                        <StatCard delay={0.15} icon={<Icon.clock className="w-5 h-5" style={{ color: '#f59e0b' }} />}
                            label="Pending" value={stats.pending} color="#f59e0b" />
                        <StatCard delay={0.2} icon={<Icon.alert className="w-5 h-5" style={{ color: '#ef4444' }} />}
                            label="Escalated" value={stats.escalated} color="#ef4444" />
                    </div>

                    {/* ── Progress Bar ── */}
                    {stats.total > 0 && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="glass-panel rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-white/70">Resolution Progress</p>
                                <p className="text-sm font-bold" style={{ color: '#10b981' }}>
                                    {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% resolved
                                </p>
                            </div>
                            <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                                    transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)' }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                {[
                                    { label: 'Resolved', val: stats.resolved, color: '#10b981' },
                                    { label: 'Pending', val: stats.pending, color: '#f59e0b' },
                                    { label: 'Escalated', val: stats.escalated, color: '#ef4444' },
                                ].map(s => (
                                    <div key={s.label} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                        <span className="text-xs text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.label}: <span className="font-semibold text-white/60">{s.val}</span></span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Escalation Timeline ── */}
                    <AnimatePresence>
                        {latestComplaints.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                                className="glass-panel rounded-3xl p-7">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Latest Escalation Status</h2>
                                        <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            {latestComplaints[0]?.title || 'Most recent complaint'}
                                        </p>
                                    </div>
                                    <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                                        style={{
                                            background: latestComplaints[0]?.status === 'Resolved' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                            color: latestComplaints[0]?.status === 'Resolved' ? '#10b981' : '#f59e0b',
                                            border: `1px solid ${latestComplaints[0]?.status === 'Resolved' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                        }}>
                                        {latestComplaints[0]?.status || 'Pending'}
                                    </span>
                                </div>
                                <EscalationTimeline
                                    escalationLevel={latestComplaints[0]?.escalationLevel || 1}
                                    status={latestComplaints[0]?.status || 'Pending'}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Complaints Feed ── */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="glass-panel rounded-3xl p-7">

                        {/* Feed Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
                            <div>
                                <h2 className="text-lg font-bold text-white">Your Complaints</h2>
                                <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {filtered.length} {filter === 'all' ? 'total' : filter} complaint{filtered.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {/* Filter Pills */}
                            <div className="flex gap-1.5 p-1.5 rounded-2xl flex-wrap"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {FILTERS.map(f => (
                                    <FilterTab key={f.key} label={f.label} count={f.count} active={filter === f.key} onClick={() => setFilter(f.key)} />
                                ))}
                            </div>
                        </div>

                        {/* Complaint List */}
                        <AnimatePresence mode="wait">
                            {filtered.length === 0 ? (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <EmptyState onNew={() => setShowModal(true)} />
                                </motion.div>
                            ) : (
                                <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="space-y-4">
                                    {filtered.map((complaint, i) => (
                                        <motion.div key={complaint._id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.06, duration: 0.4 }}>
                                            <ComplaintCard complaint={complaint} onUpdate={fetchDashboardData} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* ── Quick Tips (first time) ── */}
                    {stats.total === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                            className="grid sm:grid-cols-3 gap-4">
                            {[
                                { icon: '📍', title: 'Geo-tag your issue', desc: 'Pin your exact location for faster routing to the right department.' },
                                { icon: '📸', title: 'Attach evidence', desc: 'Photos and documents increase resolution speed by 3x.' },
                                { icon: '🔔', title: 'Track in real time', desc: 'Get notified at every step — from filing to final resolution.' },
                            ].map((tip, i) => (
                                <motion.div key={tip.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.65 + i * 0.08 }}
                                    className="glass-panel rounded-2xl p-5 card-hover cursor-default">
                                    <div className="text-2xl mb-3">{tip.icon}</div>
                                    <p className="text-sm font-bold text-white mb-1">{tip.title}</p>
                                    <p className="text-xs text-white/40 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{tip.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                </div>

                {/* ── Modal ── */}
                <NewComplaintModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { fetchDashboardData(); setShowModal(false); }}
                />

                <AadhaarVerifyModal
                    isOpen={showAadhaar}
                    onClose={() => setShowAadhaar(false)}
                    onVerified={() => { updateAadhaarVerification(); setShowAadhaar(false); }}
                />
            </div>
        </DashboardLayout>
    );
}