import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

const Ico = {
    bell: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    shield: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    eye: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    logout: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    trash: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    info: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    chev: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
};

function Toggle({ on, onToggle }) {
    return (
        <motion.button onClick={onToggle} whileTap={{ scale: 0.9 }}
            className="relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0"
            style={{ background: on ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'rgba(255,255,255,0.1)' }}>
            <motion.div animate={{ x: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" />
        </motion.button>
    );
}

function SettingRow({ icon, title, subtitle, right, danger, onClick }) {
    return (
        <motion.div whileHover={onClick ? { x: 3 } : {}} onClick={onClick}
            className="flex items-center justify-between gap-4 py-4 group"
            style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: onClick ? 'pointer' : 'default',
            }}>
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                        background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)',
                        border: danger ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.07)'
                    }}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: danger ? '#ef4444' : 'white' }}>{title}</p>
                    {subtitle && <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans',sans-serif" }}>{subtitle}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {right}
                {onClick && <Ico.chev className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />}
            </div>
        </motion.div>
    );
}

function Section({ title, children }) {
    return (
        <div className="rounded-3xl p-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-4"
                style={{ fontFamily: "'DM Sans',sans-serif" }}>{title}</p>
            {children}
        </div>
    );
}

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';

    const [notifs, setNotifs] = useState({
        email: true,
        statusUpdate: true,
        escalation: true,
        digest: false,
    });
    const [privacy, setPrivacy] = useState({
        publicProfile: true,
        showLocation: true,
        anonymise: false,
    });
    const [logoutModal, setLogoutModal] = useState(false);
    const [toast, setToast] = useState('');

    const toast$ = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleLogout = () => { logout(); navigate('/login'); };

    const APP_VERSION = '1.0.0';

    return (
        <DashboardLayout>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                        className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-semibold"
                        style={{
                            background: 'rgba(10,16,30,0.97)', border: '1px solid rgba(16,185,129,0.3)',
                            color: '#10b981', fontFamily: "'DM Sans',sans-serif"
                        }}>
                        ✅ {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Logout confirm modal */}
            <AnimatePresence>
                {logoutModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setLogoutModal(false)}>
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm rounded-3xl p-7 text-center"
                            style={{
                                background: 'rgba(10,16,30,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                                fontFamily: "'Syne','DM Sans',sans-serif"
                            }}>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <Ico.logout className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-extrabold text-white mb-2">Sign Out?</h3>
                            <p className="text-sm text-white/40 mb-6" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                You'll need to sign in again to access your account.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setLogoutModal(false)}
                                    className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/50"
                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    Cancel
                                </button>
                                <motion.button whileTap={{ scale: 0.96 }} onClick={handleLogout}
                                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white relative overflow-hidden group">
                                    <span className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600" />
                                    <span className="relative z-10">Sign Out</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="max-w-2xl mx-auto space-y-5" style={{ fontFamily: "'Syne','DM Sans',sans-serif" }}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Settings</h1>
                    <p className="text-sm text-white/35" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        Manage your preferences and account options
                    </p>
                </motion.div>

                {/* ── Notifications ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                    <Section title="Notifications">
                        <SettingRow icon={<Ico.bell className="w-4 h-4 text-blue-400" />}
                            title="Email Notifications" subtitle="Receive updates via email"
                            right={<Toggle on={notifs.email} onToggle={() => { setNotifs(n => ({ ...n, email: !n.email })); toast$('Preference saved'); }} />} />
                        <SettingRow icon={<span className="text-sm">📋</span>}
                            title="Status Updates" subtitle="When admin changes complaint status"
                            right={<Toggle on={notifs.statusUpdate} onToggle={() => { setNotifs(n => ({ ...n, statusUpdate: !n.statusUpdate })); toast$('Preference saved'); }} />} />
                        <SettingRow icon={<span className="text-sm">🔺</span>}
                            title="Escalation Alerts" subtitle="When your complaint is escalated"
                            right={<Toggle on={notifs.escalation} onToggle={() => { setNotifs(n => ({ ...n, escalation: !n.escalation })); toast$('Preference saved'); }} />} />
                        <SettingRow icon={<span className="text-sm">📰</span>}
                            title="Weekly Digest" subtitle="Summary of civic activity in your area"
                            right={<Toggle on={notifs.digest} onToggle={() => { setNotifs(n => ({ ...n, digest: !n.digest })); toast$('Preference saved'); }} />} />
                    </Section>
                </motion.div>

                {/* ── Privacy ── */}
                {!isAdmin && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Section title="Privacy">
                            <SettingRow icon={<Ico.eye className="w-4 h-4 text-emerald-400" />}
                                title="Public Complaints" subtitle="Show your complaints in public feed"
                                right={<Toggle on={privacy.publicProfile} onToggle={() => { setPrivacy(p => ({ ...p, publicProfile: !p.publicProfile })); toast$('Preference saved'); }} />} />
                            <SettingRow icon={<span className="text-sm">📍</span>}
                                title="Show Location" subtitle="Display city/area on public feed"
                                right={<Toggle on={privacy.showLocation} onToggle={() => { setPrivacy(p => ({ ...p, showLocation: !p.showLocation })); toast$('Preference saved'); }} />} />
                            <SettingRow icon={<span className="text-sm">🕵️</span>}
                                title="Anonymous Mode" subtitle="Hide your name on public complaints"
                                right={<Toggle on={privacy.anonymise} onToggle={() => { setPrivacy(p => ({ ...p, anonymise: !p.anonymise })); toast$('Preference saved'); }} />} />
                        </Section>
                    </motion.div>
                )}

                {/* ── Account ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                    <Section title="Account">
                        <SettingRow icon={<Ico.shield className="w-4 h-4 text-purple-400" />}
                            title="Profile & Security" subtitle="Edit name, change password"
                            onClick={() => navigate('/profile')} />
                        <SettingRow icon={<Ico.info className="w-4 h-4 text-blue-400" />}
                            title="Aadhaar Verification" subtitle={user?.aadhaarVerified ? 'Verified ✅' : 'Not yet verified'}
                            onClick={!user?.aadhaarVerified && !isAdmin ? () => navigate('/citizen') : undefined} />
                    </Section>
                </motion.div>

                {/* ── About ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                    <Section title="About">
                        <div className="space-y-0">
                            {[
                                { k: 'App Version', v: `v${APP_VERSION}` },
                                { k: 'Platform', v: 'CivicConnect Intelligence Platform' },
                                { k: 'Role', v: isAdmin ? 'Authority Admin' : 'Citizen' },
                                { k: 'Account ID', v: user?._id?.slice(-8).toUpperCase() },
                            ].map(({ k, v }) => (
                                <div key={k} className="flex items-center justify-between py-3"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans',sans-serif" }}>{k}</p>
                                    <p className="text-sm text-white/70 font-semibold" style={{ fontFamily: "'DM Sans',sans-serif" }}>{v}</p>
                                </div>
                            ))}
                        </div>
                    </Section>
                </motion.div>

                {/* ── Danger Zone ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                    <div className="rounded-3xl p-6"
                        style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400/60 mb-4"
                            style={{ fontFamily: "'DM Sans',sans-serif" }}>Danger Zone</p>
                        <SettingRow icon={<Ico.logout className="w-4 h-4 text-red-400" />}
                            title="Sign Out" subtitle="Log out of this device" danger
                            onClick={() => setLogoutModal(true)} />
                    </div>
                </motion.div>

            </div>
        </DashboardLayout>
    );
}