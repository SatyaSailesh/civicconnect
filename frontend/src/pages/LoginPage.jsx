import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

// ─── Magnetic Button (same as landing) ───────────────────────────────────────
function MagneticButton({ children, className }) {
    const ref = useRef();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 300, damping: 20 });
    const sy = useSpring(y, { stiffness: 300, damping: 20 });

    const handleMove = (e) => {
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.25);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.25);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ x: sx, y: sy }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ─── Floating Particle ────────────────────────────────────────────────────────
function ParticleField() {
    const particles = useRef(
        Array.from({ length: 35 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2.5 + 1,
            duration: Math.random() * 18 + 10,
            delay: Math.random() * 8,
            opacity: Math.random() * 0.35 + 0.08,
            color: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#3b82f6' : '#8b5cf6',
        }))
    ).current;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, opacity: p.opacity }}
                    animate={{ y: [0, -35, 0], x: [0, (Math.random() - 0.5) * 18, 0], opacity: [p.opacity, p.opacity * 1.6, p.opacity] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
        </div>
    );
}

// ─── Animated Grid Lines ─────────────────────────────────────────────────────
function GridBackground() {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid-login" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-login)" />
        </svg>
    );
}

// ─── Live Stats Strip ─────────────────────────────────────────────────────────
const LIVE_STATS = [
    { label: 'Citizens Online', value: '2,847', color: '#10b981' },
    { label: 'Issues Resolved Today', value: '142', color: '#3b82f6' },
    { label: 'Active Grievances', value: '891', color: '#f59e0b' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginRole, setLoginRole] = useState('citizen');
    const [adminCode, setAdminCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showAdminCode, setShowAdminCode] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const loggedInUser = await login({
                email,
                password,
                role: loginRole,
                adminSecretCode: loginRole === 'admin' ? adminCode : undefined,
            });
            setSuccess(true);
            setTimeout(() => {
                navigate(loggedInUser?.role === 'admin' ? '/admin' : '/citizen', { replace: true });
            }, 800);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen bg-[#03070f] text-white overflow-hidden flex items-center justify-center"
            style={{ fontFamily: "'Syne', 'DM Sans', sans-serif" }}
        >
            {/* ── Fonts ── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .input-field {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 14px 18px;
          width: 100%;
          outline: none;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          transition: all 0.25s ease;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.2); }
        .input-field:focus { border-color: rgba(16,185,129,0.5); background: rgba(16,185,129,0.04); box-shadow: 0 0 0 3px rgba(16,185,129,0.08); }
        .input-field.error-state { border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.04); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #03070f; }
        ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 2px; }
      `}</style>

            {/* ── Background ── */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Radial glows */}
                <div style={{ background: 'radial-gradient(ellipse 70% 55% at 15% 50%, rgba(16,185,129,0.10) 0%, transparent 70%)' }} className="absolute inset-0" />
                <div style={{ background: 'radial-gradient(ellipse 60% 50% at 85% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} className="absolute inset-0" />
                <div style={{ background: 'radial-gradient(ellipse 40% 40% at 50% 100%, rgba(139,92,246,0.06) 0%, transparent 70%)' }} className="absolute inset-0" />
                <GridBackground />
                <ParticleField />
            </div>

            {/* ── Main Layout ── */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-center min-h-screen">

                {/* ── LEFT PANEL — Branding ── */}
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:flex flex-col justify-center"
                >
                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-3 mb-14 group w-fit">
                        <div className="relative w-10 h-10">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-lg">🌐</div>
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#03070f]"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight group-hover:text-emerald-400 transition-colors">
                            Civic<span className="text-emerald-400">Connect</span>
                        </span>
                    </Link>

                    {/* Headline */}
                    <div className="mb-10">
                        <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5">
                            Your Voice,<br />
                            <span style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Amplified.
                            </span>
                        </h1>
                        <p className="text-white/40 text-base leading-relaxed max-w-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Sign in to access your civic dashboard, track your grievances, and hold leaders accountable in real time.
                        </p>
                    </div>

                    {/* Live stats */}
                    <div className="space-y-3 mb-10">
                        {LIVE_STATS.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.12, duration: 0.6 }}
                                className="flex items-center justify-between glass rounded-2xl px-5 py-3.5"
                            >
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.4 }}
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: stat.color }}
                                    />
                                    <span className="text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</span>
                                </div>
                                <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {['🔒 Aadhaar Verified', '🛡️ Bank-grade Security', '🇮🇳 Made in India'].map((badge, i) => (
                            <motion.span
                                key={badge}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 + i * 0.1 }}
                                className="text-xs text-white/35 glass px-3 py-1.5 rounded-full"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {badge}
                            </motion.span>
                        ))}
                    </div>
                </motion.div>

                {/* ── RIGHT PANEL — Login Form ── */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                    className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
                >
                    {/* Mobile logo */}
                    <Link to="/" className="lg:hidden inline-flex items-center gap-2.5 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-base">🌐</div>
                        <span className="text-lg font-bold">Civic<span className="text-emerald-400">Connect</span></span>
                    </Link>

                    {/* Card */}
                    <div className="relative rounded-[28px] overflow-hidden">
                        {/* Card border gradient */}
                        <div className="absolute inset-0 rounded-[28px] p-px">
                            <div className="absolute inset-0 rounded-[28px]"
                                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(59,130,246,0.15), rgba(139,92,246,0.1), transparent)' }} />
                        </div>

                        <div className="relative glass rounded-[28px] p-8 lg:p-10">
                            {/* Header */}
                            <div className="mb-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full mb-5 text-xs text-emerald-400 font-medium"
                                >
                                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                    Intelligence Portal Access
                                </motion.div>

                                <h2 className="text-3xl font-extrabold tracking-tight mb-2">Welcome Back</h2>
                                <p className="text-white/35 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    Sign in to your civic account to continue
                                </p>
                            </div>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/8 border border-red-500/20">
                                            <span className="text-red-400 text-base mt-0.5 flex-shrink-0">⚠</span>
                                            <p className="text-red-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Success State */}
                            <AnimatePresence>
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-8 gap-3"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                            className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-3xl"
                                        >
                                            ✓
                                        </motion.div>
                                        <p className="font-semibold text-emerald-400">Authenticated!</p>
                                        <p className="text-xs text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>Redirecting to dashboard…</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Form */}
                            {!success && (
                                <form onSubmit={handleLogin} className="space-y-5">
                                    {/* Email */}
                                    <div>
                                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5 ml-1"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                                onFocus={() => setFocusedField('email')}
                                                onBlur={() => setFocusedField(null)}
                                                className={`input-field pr-12 ${error ? 'error-state' : ''}`}
                                                placeholder="name@example.com"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base"
                                                style={{ color: focusedField === 'email' ? '#10b981' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s' }}>
                                                ✉
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Role Selector ── */}
                                    <div>
                                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5 ml-1"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            Login As
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'citizen', label: 'Citizen', icon: '🧑‍💼' },
                                                { value: 'admin', label: 'Govt Official', icon: '🏛️' },
                                            ].map(r => (
                                                <button key={r.value} type="button"
                                                    onClick={() => { setLoginRole(r.value); setAdminCode(''); setError(''); }}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                                                    style={{
                                                        background: loginRole === r.value
                                                            ? r.value === 'admin' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'
                                                            : 'rgba(255,255,255,0.04)',
                                                        border: loginRole === r.value
                                                            ? r.value === 'admin' ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(16,185,129,0.35)'
                                                            : '1px solid rgba(255,255,255,0.08)',
                                                        color: loginRole === r.value
                                                            ? r.value === 'admin' ? '#f59e0b' : '#10b981'
                                                            : 'rgba(255,255,255,0.35)',
                                                        fontFamily: "'DM Sans', sans-serif",
                                                    }}>
                                                    {r.icon} {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── Admin Verification Code (only when admin selected) ── */}
                                    {loginRole === 'admin' && (
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2.5 ml-1"
                                                style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,158,11,0.7)' }}>
                                                🔐 Authority Verification Code
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showAdminCode ? 'text' : 'password'}
                                                    value={adminCode}
                                                    onChange={e => { setAdminCode(e.target.value); setError(''); }}
                                                    placeholder="Enter your authority verification code"
                                                    className="input-field pr-12"
                                                    style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}
                                                />
                                                <button type="button" onClick={() => setShowAdminCode(!showAdminCode)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-sm">
                                                    {showAdminCode ? '🙈' : '👁'}
                                                </button>
                                            </div>
                                            <p className="text-[10px] mt-1.5 px-1" style={{ color: 'rgba(245,158,11,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                                Required for all government official logins. Issued by department administrator.
                                            </p>
                                        </div>
                                    )}

                                    {/* Password */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2.5 ml-1">
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                Password
                                            </label>
                                            <button type="button" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                                onFocus={() => setFocusedField('password')}
                                                onBlur={() => setFocusedField(null)}
                                                className={`input-field pr-12 ${error ? 'error-state' : ''}`}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-sm"
                                            >
                                                {showPassword ? '🙈' : '👁'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remember me */}
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => { }}
                                            className="w-5 h-5 rounded-md border border-white/15 bg-white/5 flex items-center justify-center hover:border-emerald-500/50 transition-colors flex-shrink-0"
                                        >
                                            <span className="text-[9px] text-emerald-400"></span>
                                        </button>
                                        <span className="text-xs text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>Keep me signed in for 30 days</span>
                                    </div>

                                    {/* Submit */}
                                    <MagneticButton className="w-full cursor-pointer pt-1">
                                        <motion.button
                                            type="submit"
                                            disabled={loading}
                                            whileTap={{ scale: 0.98 }}
                                            className="relative w-full py-4 rounded-2xl font-bold text-base overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group"
                                        >
                                            {/* Base gradient */}
                                            <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 transition-opacity" />
                                            {/* Hover gradient */}
                                            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                                            {/* Shimmer */}
                                            <motion.span
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                                            />

                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {loading ? (
                                                    <>
                                                        <motion.span
                                                            animate={{ rotate: 360 }}
                                                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                                                        />
                                                        Authenticating…
                                                    </>
                                                ) : (
                                                    <>
                                                        Sign In to Dashboard
                                                        <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                                                    </>
                                                )}
                                            </span>
                                        </motion.button>
                                    </MagneticButton>

                                    {/* Divider */}
                                    <div className="flex items-center gap-4 py-1">
                                        <div className="flex-1 h-px bg-white/8" />
                                        <span className="text-xs text-white/25" style={{ fontFamily: "'DM Sans', sans-serif" }}>or continue with</span>
                                        <div className="flex-1 h-px bg-white/8" />
                                    </div>

                                    {/* Social login */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Google', icon: '🔵' },
                                            { label: 'Aadhaar OTP', icon: '🪪' },
                                        ].map((provider) => (
                                            <motion.button
                                                key={provider.label}
                                                type="button"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.97 }}
                                                className="flex items-center justify-center gap-2 py-3 glass rounded-2xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                                            >
                                                <span>{provider.icon}</span> {provider.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                </form>
                            )}

                            {/* Footer link */}
                            {!success && (
                                <div className="mt-7 text-center">
                                    <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        Don't have an account?{' '}
                                        <Link to="/register"
                                            className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors underline underline-offset-2">
                                            Create a free account
                                        </Link>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security note */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-center text-xs text-white/20 mt-5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        🔒 256-bit encrypted · CERT-In compliant · No data sold
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;