import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';
import { motion as Motion } from 'framer-motion';
import MapThemeControl from '../components/MapThemeControl';

export default function SettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [capabilities, setCapabilities] = useState(null);
    useEffect(() => {
        api.get('/capabilities').then(({ data }) => setCapabilities(data)).catch(() => setCapabilities(null));
    }, []);
    async function saveEmailPreference() {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const { data } = await api.put('/auth/preferences', { emailNotifications: user?.emailNotifications === false });
            updateUser(data.user);
            setMessage('Email preference saved to your account.');
        } catch (error) { setError(error.response?.data?.message || 'Could not save your preference. Please retry.'); }
        finally { setSaving(false); }
    }
    const panel = 'rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:p-8 space-y-5';
    const headingFont = { fontFamily: "'Syne','DM Sans',sans-serif" };
    const link = 'inline-block rounded-xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/25';
    return <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8" style={{ fontFamily: "'DM Sans',sans-serif" }}>
            <Motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-emerald-400 mb-5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Your account, your preferences</p>
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] leading-tight font-extrabold text-white tracking-tight" style={headingFont}>Your Portal <span style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings</span></h1>
                <p className="text-sm text-white/60 mt-3">Manage your account, map appearance and complaint preferences.</p>
            </Motion.header>
            {error && <p role="alert" className="text-red-300">{error}</p>}
            {message && <p role="status" className="text-emerald-300">{message}</p>}
            <div className="grid lg:grid-cols-2 gap-6">
            <Motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={panel}>
                <h2 className="text-lg font-bold text-white" style={headingFont}>Map appearance</h2>
                <p className="text-sm text-white/60">Choose a light or dark basemap for your dashboard maps. Your choice is saved to your account.</p>
                <MapThemeControl />
                <p className="text-xs text-white/50">You can also switch directly above a map. Pins, status colors and heatmaps stay unchanged.</p>
            </Motion.section>
            <Motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className={panel}>
                <h2 className="text-lg font-bold text-white" style={headingFont}>Email notifications</h2>
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white/60">Receive complaint status and automatic escalation updates when email delivery is configured.</p>
                    <button type="button" role="switch" aria-label="Email notifications" aria-checked={user?.emailNotifications !== false} disabled={saving} onClick={saveEmailPreference}
                        className="rounded-full px-4 py-2 text-white text-sm font-semibold disabled:opacity-50 shrink-0" style={{ background: user?.emailNotifications !== false ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'rgba(255,255,255,0.1)' }}>
                        {saving ? 'Saving…' : user?.emailNotifications === false ? 'Off' : 'On'}
                    </button>
                </div>
                <p className="text-xs text-white/50">{capabilities === null ? 'Integration availability could not be confirmed.' : capabilities.email ? 'Email is configured; delivery depends on the provider. Updates always appear in your dashboard.' : 'Email is disabled on this server. Your preference is saved for when it is enabled; check your dashboard for updates.'}</p>
            </Motion.section>
            <Motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={panel}>
                <h2 className="text-lg font-bold text-white" style={headingFont}>Complaint privacy</h2>
                <p className="text-sm text-white/60">New complaints are private by default. Open a complaint in your dashboard to share it or make it private again. Public sharing includes your name, written location, description, photos and feedback. Private messages are never published.</p>
                <Link className={link} to={user?.role === 'admin' ? '/admin' : '/citizen'}>Manage complaints</Link>
            </Motion.section>
            <Motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className={panel}>
                <h2 className="text-lg font-bold text-white" style={headingFont}>Profile and security</h2>
                <dl className="text-sm space-y-3">
                    <div><dt className="text-white/60">Signed in as</dt><dd className="break-all text-white/70">{user?.email}</dd></div>
                    <div><dt className="text-white/60">Role</dt><dd className="text-white/70">{user?.role === 'admin' ? 'Approved official' : 'Citizen'}</dd></div>
                    <div><dt className="text-white/60">Account ID</dt><dd className="break-all font-mono text-white/70">{user?._id || user?.id}</dd></div>
                </dl>
                <Link className={link} to="/profile">Edit profile or change password</Link>
                {user?.role === 'citizen' && <p className="text-xs text-white/50">Synthetic demo verification: {user.aadhaarVerified ? 'completed' : 'not completed'}. No real Aadhaar data is collected.</p>}
            </Motion.section>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="rounded-xl px-4 py-3 bg-red-500/10 text-red-300">Sign out of this device</button>
        </div>
    </DashboardLayout>;
}
