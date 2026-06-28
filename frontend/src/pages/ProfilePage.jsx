import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const STATUS_CFG = {
    'Pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'In Progress': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    'Resolved': { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    'Rejected': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};
const CAT_ICONS = { Infrastructure: '🏗️', Corruption: '⚖️', Scam: '🚨', 'Public Service': '🏛️' };

function timeAgo(d) {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

const Ico = {
    cam: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" strokeWidth={1.5} /></svg>,
    edit: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    lock: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    eye: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    eyeX: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
    star: p => <svg {...p} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    chk: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
};

export default function ProfilePage() {
    const { user, updateAadhaarVerification } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loadingC, setLoadingC] = useState(true);
    const [tab, setTab] = useState('info');
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [avatar, setAvatar] = useState(null);
    const [pw, setPw] = useState({ old: '', new: '', confirm: '' });
    const [pwShow, setPwShow] = useState({ old: false, new: false });
    const [pwErr, setPwErr] = useState('');
    const fileRef = useRef();
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!isAdmin) {
            api.get('/complaints/my')
                .then(r => setComplaints(r.data))
                .catch(console.error)
                .finally(() => setLoadingC(false));
        } else setLoadingC(false);
    }, []);

    const toast$ = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3200);
    };

    const handleSaveName = async () => {
        setSaving(true);
        try {
            await api.put('/auth/profile', { name });
            toast$('Profile updated!');
            setEditMode(false);
        } catch { toast$('Failed to update profile', false); }
        finally { setSaving(false); }
    };

    const handleChangePassword = async () => {
        setPwErr('');
        if (pw.new !== pw.confirm) { setPwErr("New passwords don't match"); return; }
        if (pw.new.length < 8) { setPwErr("Password must be at least 8 characters"); return; }
        setSaving(true);
        try {
            await api.put('/auth/change-password', { oldPassword: pw.old, newPassword: pw.new });
            toast$('Password changed!');
            setPw({ old: '', new: '', confirm: '' });
        } catch (e) { setPwErr(e.response?.data?.message || 'Failed to change password'); }
        finally { setSaving(false); }
    };

    const stats = {
        total: complaints.length,
        resolved: complaints.filter(c => c.status === 'Resolved').length,
        pending: complaints.filter(c => c.status === 'Pending' || c.status === 'In Progress').length,
        escalated: complaints.filter(c => c.escalationLevel > 1).length,
    };

    const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const TABS = [
        { key: 'info', label: 'My Info' },
        ...(!isAdmin ? [{ key: 'history', label: `History (${stats.total})` }] : []),
        { key: 'security', label: 'Security' },
    ];

    const Input = ({ label, value, onChange, type = 'text', disabled, rightIcon }) => (
        <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-2"
                style={{ fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
            <div className="relative">
                <input type={type} value={value} onChange={onChange} disabled={disabled}
                    className="w-full px-4 py-3 rounded-2xl text-sm text-white outline-none transition-all"
                    style={{
                        background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                        fontFamily: "'DM Sans',sans-serif",
                        opacity: disabled ? 0.5 : 1,
                    }} />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>
                )}
            </div>
        </div>
    );

    return (
        <DashboardLayout>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.95 }}
                        className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
                        style={{
                            background: 'rgba(10,16,30,0.97)',
                            border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                            color: toast.ok ? '#10b981' : '#ef4444',
                            fontFamily: "'DM Sans',sans-serif",
                        }}>
                        {toast.ok ? '✅' : '❌'} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-3xl mx-auto space-y-5" style={{ fontFamily: "'Syne','DM Sans',sans-serif" }}>

                {/* ── Hero card ── */}
                <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-3xl overflow-hidden p-7"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse 60% 80% at 10% 50%,rgba(16,185,129,0.07),transparent),radial-gradient(ellipse 60% 80% at 90% 50%,rgba(59,130,246,0.05),transparent)' }} />

                    <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <motion.div whileHover={{ scale: 1.03 }}
                                className="w-20 h-20 rounded-3xl flex items-center justify-center text-xl font-extrabold text-white overflow-hidden"
                                style={{
                                    background: avatar ? 'transparent' : `linear-gradient(135deg,#8b5cf6,#3b82f6)`,
                                    border: '2px solid rgba(255,255,255,0.12)'
                                }}>
                                {avatar
                                    ? <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
                                    : initials}
                            </motion.div>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)', border: '2px solid #03070f' }}>
                                <Ico.cam className="w-3 h-3 text-white" />
                            </motion.button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden"
                                onChange={e => {
                                    const f = e.target.files[0];
                                    if (!f) return;
                                    const r = new FileReader();
                                    r.onload = ev => setAvatar(ev.target.result);
                                    r.readAsDataURL(f);
                                }} />
                        </div>

                        {/* Name / email / badges */}
                        <div className="flex-1 text-center sm:text-left">
                            {editMode ? (
                                <input value={name} onChange={e => setName(e.target.value)}
                                    className="text-2xl font-extrabold bg-transparent border-b-2 border-emerald-400/50 outline-none text-white mb-2 w-full"
                                    style={{ fontFamily: "'Syne',sans-serif" }}
                                    autoFocus />
                            ) : (
                                <h1 className="text-2xl font-extrabold text-white mb-1">{user?.name}</h1>
                            )}
                            <p className="text-sm text-white/40 mb-3" style={{ fontFamily: "'DM Sans',sans-serif" }}>{user?.email}</p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                                    style={{
                                        background: isAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.12)',
                                        color: isAdmin ? '#8b5cf6' : '#3b82f6'
                                    }}>
                                    {isAdmin ? '🏛️ Authority Admin' : '🧑‍💼 Citizen'}
                                </span>
                                {user?.aadhaarVerified
                                    ? <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>🪪 Aadhaar Verified</span>
                                    : <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>⏳ Unverified</span>}
                                <span className="text-[11px] text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                    Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {/* Edit / Save buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                            {editMode ? (
                                <>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveName} disabled={saving}
                                        className="px-4 py-2 rounded-xl text-sm font-bold relative overflow-hidden group disabled:opacity-60">
                                        <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500" />
                                        <span className="relative z-10 text-white">{saving ? 'Saving…' : '✓ Save'}</span>
                                    </motion.button>
                                    <button onClick={() => { setEditMode(false); setName(user?.name || ''); }}
                                        className="px-4 py-2 rounded-xl text-sm text-white/40"
                                        style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
                                </>
                            ) : (
                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => setEditMode(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/50"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Ico.edit className="w-3.5 h-3.5" /> Edit
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* Citizen stats row */}
                    {!isAdmin && (
                        <div className="relative grid grid-cols-4 gap-3 mt-6 pt-5"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {[
                                { v: stats.total, l: 'Total Filed', c: '#3b82f6' },
                                { v: stats.resolved, l: 'Resolved', c: '#10b981' },
                                { v: stats.pending, l: 'In Progress', c: '#f59e0b' },
                                { v: stats.escalated, l: 'Escalated', c: '#ef4444' },
                            ].map(({ v, l, c }, i) => (
                                <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.06 }}
                                    className="text-center p-3 rounded-2xl"
                                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <p className="text-2xl font-extrabold" style={{ color: c }}>{v}</p>
                                    <p className="text-[10px] text-white/35 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>{l}</p>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* ── Tabs ── */}
                <div className="flex gap-1.5 p-1.5 rounded-2xl w-fit"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                            style={{
                                background: tab === t.key ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'transparent',
                                color: tab === t.key ? 'white' : 'rgba(255,255,255,0.4)',
                                fontFamily: "'DM Sans',sans-serif",
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* ── My Info ── */}
                    {tab === 'info' && (
                        <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="rounded-3xl p-6 space-y-5"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 className="text-base font-bold text-white">Account Details</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {[
                                    { label: 'Full Name', value: user?.name },
                                    { label: 'Email', value: user?.email },
                                    { label: 'Role', value: isAdmin ? 'Authority Admin' : 'Citizen' },
                                    { label: 'Aadhaar', value: user?.aadhaarVerified ? '✅ Verified' : '⏳ Not Verified' },
                                    { label: 'Account ID', value: user?._id?.slice(-10).toUpperCase() },
                                    { label: 'Member Since', value: new Date(user?.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-4 rounded-2xl"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5"
                                            style={{ fontFamily: "'DM Sans',sans-serif" }}>{label}</p>
                                        <p className="text-sm font-semibold text-white" style={{ fontFamily: "'DM Sans',sans-serif" }}>{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Complaint History ── */}
                    {tab === 'history' && !isAdmin && (
                        <motion.div key="hist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="rounded-3xl p-6"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 className="text-base font-bold text-white mb-5">All My Complaints</h3>
                            {loadingC ? (
                                <div className="space-y-3">
                                    {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse"
                                        style={{ background: 'rgba(255,255,255,0.04)' }} />)}
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="text-center py-14">
                                    <p className="text-5xl mb-3">📭</p>
                                    <p className="text-white/35 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>No complaints filed yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {complaints.map((c, i) => {
                                        const cfg = STATUS_CFG[c.status] || STATUS_CFG['Pending'];
                                        return (
                                            <motion.div key={c._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="flex items-center gap-4 p-4 rounded-2xl"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                                                    style={{ background: `${cfg.color}18` }}>
                                                    {CAT_ICONS[c.category] || '📋'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-white truncate">{c.title}</p>
                                                        {c.complaintId && <span className="text-[10px] text-white/20 font-mono hidden sm:block">{c.complaintId}</span>}
                                                    </div>
                                                    <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                        📍 {c.city || c.location} · {timeAgo(c.createdAt)}
                                                    </p>
                                                    {c.adminFeedback && (
                                                        <p className="text-[11px] mt-1 truncate" style={{ color: '#3b82f6', fontFamily: "'DM Sans',sans-serif" }}>
                                                            💬 {c.adminFeedback}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                                        style={{ background: cfg.bg, color: cfg.color, fontFamily: "'DM Sans',sans-serif" }}>
                                                        {c.status}
                                                    </span>
                                                    {c.rating && (
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Ico.star key={s} className="w-2.5 h-2.5"
                                                                    style={{ color: s <= c.rating ? '#f59e0b' : 'rgba(255,255,255,0.12)' }} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Security ── */}
                    {tab === 'security' && (
                        <motion.div key="sec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="space-y-4">

                            {/* Change password */}
                            <div className="rounded-3xl p-6 space-y-4"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                        <Ico.lock className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Change Password</h3>
                                        <p className="text-[11px] text-white/30" style={{ fontFamily: "'DM Sans',sans-serif" }}>Minimum 8 characters</p>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {pwErr && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="p-3 rounded-2xl flex items-center gap-2"
                                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <span>⚠</span>
                                            <p className="text-red-400 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>{pwErr}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Input label="Current Password" type={pwShow.old ? 'text' : 'password'}
                                    value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))}
                                    rightIcon={<button onClick={() => setPwShow(s => ({ ...s, old: !s.old }))}>
                                        {pwShow.old ? <Ico.eyeX className="w-4 h-4 text-white/30" /> : <Ico.eye className="w-4 h-4 text-white/30" />}
                                    </button>} />
                                <Input label="New Password" type={pwShow.new ? 'text' : 'password'}
                                    value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))}
                                    rightIcon={<button onClick={() => setPwShow(s => ({ ...s, new: !s.new }))}>
                                        {pwShow.new ? <Ico.eyeX className="w-4 h-4 text-white/30" /> : <Ico.eye className="w-4 h-4 text-white/30" />}
                                    </button>} />
                                <Input label="Confirm New Password" type={pwShow.new ? 'text' : 'password'}
                                    value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />

                                {/* Strength bar */}
                                {pw.new && (
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4].map(l => {
                                            const strength = [pw.new.length >= 8, /[A-Z]/.test(pw.new), /[0-9]/.test(pw.new), /[^A-Za-z0-9]/.test(pw.new)].filter(Boolean).length;
                                            return <div key={l} className="h-1 flex-1 rounded-full transition-all duration-300"
                                                style={{
                                                    background: l <= strength
                                                        ? strength <= 1 ? '#ef4444' : strength <= 2 ? '#f59e0b' : strength <= 3 ? '#3b82f6' : '#10b981'
                                                        : 'rgba(255,255,255,0.07)'
                                                }} />;
                                        })}
                                    </div>
                                )}

                                <motion.button whileTap={{ scale: 0.97 }} onClick={handleChangePassword}
                                    disabled={saving || !pw.old || !pw.new || !pw.confirm}
                                    className="w-full py-3.5 rounded-2xl font-bold text-sm relative overflow-hidden group disabled:opacity-50">
                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600" />
                                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative z-10 text-white flex items-center justify-center gap-2">
                                        <Ico.lock className="w-4 h-4" /> Update Password
                                    </span>
                                </motion.button>
                            </div>

                            {/* Aadhaar status */}
                            {!isAdmin && (
                                <div className="rounded-3xl p-6"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 className="text-base font-bold text-white mb-4">Identity Verification</h3>
                                    <div className="flex items-center gap-4 p-4 rounded-2xl"
                                        style={{
                                            background: user?.aadhaarVerified ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
                                            border: `1px solid ${user?.aadhaarVerified ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                        }}>
                                        <span className="text-3xl">{user?.aadhaarVerified ? '🪪' : '⏳'}</span>
                                        <div>
                                            <p className="text-sm font-bold" style={{ color: user?.aadhaarVerified ? '#10b981' : '#f59e0b' }}>
                                                {user?.aadhaarVerified ? 'Aadhaar Verified' : 'Verification Pending'}
                                            </p>
                                            <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                {user?.aadhaarVerified
                                                    ? 'Your identity is confirmed. You can file and track complaints.'
                                                    : 'Verify your Aadhaar to unlock complaint filing.'}
                                            </p>
                                        </div>
                                        {user?.aadhaarVerified && <Ico.chk className="w-5 h-5 text-emerald-400 ml-auto" />}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}

// Helper used inside security tab
function Input({ label, value, onChange, type = 'text', disabled, rightIcon }) {
    return (
        <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-2"
                style={{ fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
            <div className="relative">
                <input type={type} value={value} onChange={onChange} disabled={disabled}
                    className="w-full px-4 py-3 rounded-2xl text-sm text-white outline-none"
                    style={{
                        background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                        fontFamily: "'DM Sans',sans-serif",
                    }} />
                {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>}
            </div>
        </div>
    );
}