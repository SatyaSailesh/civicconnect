import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

// ─── Magnetic Button ──────────────────────────────────────────────────────────
function MagneticButton({ children, className }) {
    const ref = useRef();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 300, damping: 20 });
    const sy = useSpring(y, { stiffness: 300, damping: 20 });

    return (
        <motion.div
            ref={ref}
            onMouseMove={(e) => {
                const r = ref.current.getBoundingClientRect();
                x.set((e.clientX - r.left - r.width / 2) * 0.25);
                y.set((e.clientY - r.top - r.height / 2) * 0.25);
            }}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ x: sx, y: sy }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ─── Particles ────────────────────────────────────────────────────────────────
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
                <motion.div key={p.id} className="absolute rounded-full"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, opacity: p.opacity }}
                    animate={{ y: [0, -35, 0], x: [0, (p.id % 2 === 0 ? 1 : -1) * 10, 0], opacity: [p.opacity, p.opacity * 1.6, p.opacity] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
        </div>
    );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
    const checks = [
        { label: '8+ characters', pass: password.length >= 8 },
        { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
        { label: 'Number', pass: /\d/.test(password) },
        { label: 'Special character', pass: /[^a-zA-Z0-9]/.test(password) },
    ];
    const score = checks.filter(c => c.pass).length;
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];

    if (!password) return null;

    return (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2">
            <div className="flex gap-1.5">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/8">
                        <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: i < score ? '100%' : '0%' }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            style={{ background: colors[score - 1] || '#ef4444' }} />
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between">
                <div className="flex gap-3 flex-wrap">
                    {checks.map(c => (
                        <span key={c.label} className="text-[10px] flex items-center gap-1"
                            style={{ color: c.pass ? '#10b981' : 'rgba(255,255,255,0.25)', fontFamily: "'DM Sans', sans-serif" }}>
                            <span>{c.pass ? '✓' : '○'}</span> {c.label}
                        </span>
                    ))}
                </div>
                {score > 0 && (
                    <span className="text-[10px] font-bold" style={{ color: colors[score - 1] }}>{labels[score - 1]}</span>
                )}
            </div>
        </motion.div>
    );
}

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({ value, label, description, icon, selected, onSelect }) {
    return (
        <motion.button type="button" onClick={() => onSelect(value)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="relative flex-1 p-4 rounded-2xl border text-left transition-all duration-200 overflow-hidden"
            style={{
                background: selected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                borderColor: selected ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)',
            }}>
            {selected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white">
                    ✓
                </motion.div>
            )}
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-bold text-white mb-0.5">{label}</p>
            <p className="text-[11px] text-white/35 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{description}</p>
        </motion.button>
    );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, total }) {
    return (
        <div className="flex items-center gap-2 mb-7">
            {Array.from({ length: total }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="relative">
                        <motion.div
                            animate={{ scale: i === step ? 1 : 0.85, opacity: i === step ? 1 : i < step ? 0.8 : 0.3 }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                                background: i < step ? '#10b981' : i === step ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'rgba(255,255,255,0.07)',
                                border: i === step ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                color: i <= step ? 'white' : 'rgba(255,255,255,0.3)',
                            }}>
                            {i < step ? '✓' : i + 1}
                        </motion.div>
                    </div>
                    {i < total - 1 && (
                        <div className="w-8 h-px" style={{ background: i < step ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
                    )}
                </div>
            ))}
            <span className="ml-1 text-xs text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Step {step + 1} of {total}
            </span>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const STEP_TITLES = ['Your Identity', 'Secure Access', 'Your Role'];
const STEP_SUBTITLES = ['Let\'s start with your basic info', 'Create a strong password', 'How will you use CivicConnect?'];

export default function RegisterPage() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'citizen', adminSecretCode: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const { register } = useAuth();
    const navigate = useNavigate();

    const update = (field, val) => { setForm(f => ({ ...f, [field]: val })); setError(''); };

    const nextStep = (e) => {
        e.preventDefault();
        setError('');
        if (step === 0) {
            if (!form.name.trim() || !form.email.trim()) return setError('Please fill in all fields.');
            if (!/\S+@\S+\.\S+/.test(form.email)) return setError('Please enter a valid email address.');
        }
        if (step === 1) {
            if (form.password.length < 8) return setError('Password must be at least 8 characters.');
            if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
        }
        setStep(s => s + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { confirmPassword, ...payload } = form;
            const result = await register(payload);
            // Admin accounts return pendingApproval=true — no token issued
            if (result?.pendingApproval) {
                setSuccess(true);
                // Don't navigate — show pending message instead
                return;
            }
            setSuccess(true);
            setTimeout(() => navigate(form.role === 'citizen' ? '/citizen' : '/admin'), 1100);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const BENEFITS = {
        citizen: ['File geo-tagged grievances', 'Track resolution in real-time', 'Rate your representatives', 'Join 10K+ active citizens'],
        admin: ['Manage constituency issues', 'View performance analytics', 'Respond to citizens directly', 'Access escalation dashboard'],
    };

    return (
        <div className="relative min-h-screen bg-[#03070f] text-white overflow-hidden flex items-center justify-center"
            style={{ fontFamily: "'Syne', 'DM Sans', sans-serif" }}>

            {/* ── Fonts & Styles ── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .input-field {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 13px 18px; width: 100%; outline: none;
          color: white; font-family: 'DM Sans', sans-serif; font-size: 14px; transition: all 0.25s ease;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.2); }
        .input-field:focus { border-color: rgba(16,185,129,0.5); background: rgba(16,185,129,0.04); box-shadow: 0 0 0 3px rgba(16,185,129,0.08); }
        .input-field.error-state { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.03); }
        select.input-field option { background: #0d1825; color: white; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 2px; }
      `}</style>

            {/* ── Background ── */}
            <div className="absolute inset-0 pointer-events-none">
                <div style={{ background: 'radial-gradient(ellipse 70% 55% at 15% 50%, rgba(16,185,129,0.10) 0%, transparent 70%)' }} className="absolute inset-0" />
                <div style={{ background: 'radial-gradient(ellipse 60% 50% at 85% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} className="absolute inset-0" />
                <div style={{ background: 'radial-gradient(ellipse 40% 40% at 50% 100%, rgba(139,92,246,0.06) 0%, transparent 70%)' }} className="absolute inset-0" />
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid-reg" width="48" height="48" patternUnits="userSpaceOnUse">
                            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-reg)" />
                </svg>
                <ParticleField />
            </div>

            {/* ── Layout ── */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-center min-h-screen">

                {/* ── LEFT — Branding ── */}
                <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:flex flex-col justify-center">

                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-3 mb-14 group w-fit">
                        <div className="relative w-10 h-10">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-lg">🌐</div>
                            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
                                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#03070f]" />
                        </div>
                        <span className="text-xl font-bold tracking-tight group-hover:text-emerald-400 transition-colors">
                            Civic<span className="text-emerald-400">Connect</span>
                        </span>
                    </Link>

                    {/* Headline */}
                    <div className="mb-10">
                        <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5">
                            Join the<br />
                            <span style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Civic Revolution.
                            </span>
                        </h1>
                        <p className="text-white/40 text-base leading-relaxed max-w-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Create your free account and become part of India's most transparent governance platform.
                        </p>
                    </div>

                    {/* Dynamic benefits based on selected role */}
                    <div className="mb-8">
                        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {form.role === 'citizen' ? 'Citizen' : 'Official'} benefits
                        </p>
                        <div className="space-y-2.5">
                            {BENEFITS[form.role].map((b, i) => (
                                <motion.div key={b} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 flex-shrink-0">✓</span>
                                    <span className="text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{b}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Social proof */}
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {['A', 'B', 'C', 'D', 'E'].map(l => (
                                <div key={l} className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/40 to-blue-500/40 border-2 border-[#03070f] flex items-center justify-center text-[9px] font-bold">{l}</div>
                            ))}
                        </div>
                        <p className="text-xs text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <span className="text-white font-semibold">10,000+</span> citizens already making a difference
                        </p>
                    </div>
                </motion.div>

                {/* ── RIGHT — Form ── */}
                <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                    className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">

                    {/* Mobile logo */}
                    <Link to="/" className="lg:hidden inline-flex items-center gap-2.5 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-base">🌐</div>
                        <span className="text-lg font-bold">Civic<span className="text-emerald-400">Connect</span></span>
                    </Link>

                    {/* Card */}
                    <div className="relative rounded-[28px] overflow-hidden">
                        <div className="absolute inset-0 rounded-[28px]"
                            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(59,130,246,0.15), rgba(139,92,246,0.1), transparent)', padding: 1 }} />
                        <div className="relative glass rounded-[28px] p-8 lg:p-10">

                            {/* Header */}
                            <div className="mb-7">
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full mb-5 text-xs text-emerald-400 font-medium">
                                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                    Create Free Account
                                </motion.div>
                                <h2 className="text-3xl font-extrabold tracking-tight mb-1.5">
                                    {success ? 'You\'re in! 🎉' : STEP_TITLES[step]}
                                </h2>
                                <p className="text-white/35 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {success ? 'Redirecting to your dashboard…' : STEP_SUBTITLES[step]}
                                </p>
                            </div>

                            {/* Step indicator */}
                            {!success && <StepIndicator step={step} total={3} />}

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="overflow-hidden">
                                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/8 border border-red-500/20">
                                            <span className="text-red-400 text-base mt-0.5 flex-shrink-0">⚠</span>
                                            <p className="text-red-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── SUCCESS ── */}
                            <AnimatePresence>
                                {success && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-10 gap-4">
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                            className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-4xl">
                                            ✓
                                        </motion.div>
                                        <div className="text-center">
                                            <p className="font-semibold text-emerald-400 text-lg">Account Created!</p>
                                            <p className="text-xs text-white/35 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                Welcome to CivicConnect, {form.name.split(' ')[0]}
                                            </p>
                                        </div>
                                        <motion.div className="w-48 h-1 rounded-full bg-white/8 overflow-hidden">
                                            <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full"
                                                initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── STEP 0: Identity ── */}
                            <AnimatePresence mode="wait">
                                {!success && step === 0 && (
                                    <motion.form key="step0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}
                                        onSubmit={nextStep} className="space-y-5">

                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5 ml-1"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}>Full Name</label>
                                            <div className="relative">
                                                <input type="text" required value={form.name}
                                                    onChange={e => update('name', e.target.value)}
                                                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                                                    className={`input-field pr-12 ${error ? 'error-state' : ''}`}
                                                    placeholder="Rahul Sharma" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base"
                                                    style={{ color: focusedField === 'name' ? '#10b981' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s' }}>
                                                    👤
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5 ml-1"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}>Email Address</label>
                                            <div className="relative">
                                                <input type="email" required value={form.email}
                                                    onChange={e => update('email', e.target.value)}
                                                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                                                    className={`input-field pr-12 ${error ? 'error-state' : ''}`}
                                                    placeholder="rahul@example.com" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base"
                                                    style={{ color: focusedField === 'email' ? '#10b981' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s' }}>
                                                    ✉
                                                </span>
                                            </div>
                                        </div>

                                        <MagneticButton className="w-full cursor-pointer pt-1">
                                            <button type="submit"
                                                className="relative w-full py-4 rounded-2xl font-bold text-base overflow-hidden group">
                                                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    Continue <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                                                </span>
                                            </button>
                                        </MagneticButton>
                                    </motion.form>
                                )}

                                {/* ── STEP 1: Password ── */}
                                {!success && step === 1 && (
                                    <motion.form key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}
                                        onSubmit={nextStep} className="space-y-5">

                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5 ml-1"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}>Password</label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                                                    onChange={e => update('password', e.target.value)}
                                                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                                                    className={`input-field pr-12 ${error ? 'error-state' : ''}`}
                                                    placeholder="Create a strong password" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-sm">
                                                    {showPassword ? '🙈' : '👁'}
                                                </button>
                                            </div>
                                            <AnimatePresence>
                                                {form.password && <PasswordStrength password={form.password} />}
                                            </AnimatePresence>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5 ml-1"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}>Confirm Password</label>
                                            <div className="relative">
                                                <input type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword}
                                                    onChange={e => update('confirmPassword', e.target.value)}
                                                    onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)}
                                                    className={`input-field pr-12 ${form.confirmPassword && form.password !== form.confirmPassword ? 'error-state' : ''
                                                        }`}
                                                    placeholder="Re-enter your password" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base">
                                                    {form.confirmPassword
                                                        ? form.password === form.confirmPassword
                                                            ? <span style={{ color: '#10b981' }}>✓</span>
                                                            : <span style={{ color: '#ef4444' }}>✗</span>
                                                        : <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                                            className="text-white/30 hover:text-white/70 transition-colors">
                                                            {showConfirm ? '🙈' : '👁'}
                                                        </button>
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-1">
                                            <motion.button type="button" onClick={() => setStep(0)} whileTap={{ scale: 0.97 }}
                                                className="flex-1 py-4 glass rounded-2xl font-semibold text-sm text-white/60 hover:text-white transition-colors">
                                                ← Back
                                            </motion.button>
                                            <MagneticButton className="flex-[2] cursor-pointer">
                                                <button type="submit"
                                                    className="relative w-full py-4 rounded-2xl font-bold text-base overflow-hidden group">
                                                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                                        Continue <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                                                    </span>
                                                </button>
                                            </MagneticButton>
                                        </div>
                                    </motion.form>
                                )}

                                {/* ── STEP 2: Role ── */}
                                {!success && step === 2 && (
                                    <motion.form key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}
                                        onSubmit={handleSubmit} className="space-y-5">

                                        <div className="flex gap-3">
                                            <RoleCard value="citizen" label="Citizen" icon="🧑‍💼"
                                                description="File grievances & track resolutions"
                                                selected={form.role === 'citizen'} onSelect={r => update('role', r)} />
                                            <RoleCard value="admin" label="Govt Official" icon="🏛️"
                                                description="Manage issues & respond to citizens"
                                                selected={form.role === 'admin'} onSelect={r => update('role', r)} />
                                        </div>

                                        {/* Role info */}
                                        <motion.div key={form.role}
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            className="glass rounded-2xl p-4">
                                            <p className="text-xs text-white/40 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                {form.role === 'citizen'
                                                    ? '🔹 You\'ll be able to file complaints, track escalations, and rate your elected officials after verification.'
                                                    : '🔐 Official accounts are restricted. You need an authority verification code issued by your department administrator. Your account will be reviewed before activation.'}
                                            </p>
                                        </motion.div>

                                        {/* Admin secret code — only shown when admin role selected */}
                                        {form.role === 'admin' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                                                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/70 mb-2"
                                                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                    🔐 Authority Verification Code *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        value={form.adminSecretCode}
                                                        onChange={e => update('adminSecretCode', e.target.value)}
                                                        placeholder="Enter your department-issued authority code"
                                                        className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/20 outline-none"
                                                        style={{
                                                            background: 'rgba(245,158,11,0.05)',
                                                            border: '1px solid rgba(245,158,11,0.25)',
                                                            fontFamily: "'DM Sans', sans-serif",
                                                        }}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/40 text-xs">🔒</span>
                                                </div>
                                                <p className="text-[10px] text-amber-400/40 mt-1.5 px-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                    This code is provided by your department. Unauthorised access attempts are logged.
                                                </p>
                                            </motion.div>
                                        )}

                                        {/* Terms */}
                                        <div className="flex items-start gap-3 px-1">
                                            <div className="w-5 h-5 rounded-md border border-white/15 bg-white/5 flex items-center justify-center mt-0.5 flex-shrink-0">
                                                <span className="text-[9px] text-emerald-400">✓</span>
                                            </div>
                                            <p className="text-xs text-white/30 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                I agree to the{' '}
                                                <span className="text-emerald-400 cursor-pointer hover:underline">Terms of Service</span>
                                                {' '}&amp;{' '}
                                                <span className="text-emerald-400 cursor-pointer hover:underline">Privacy Policy</span>.
                                                My data will never be sold.
                                            </p>
                                        </div>

                                        <div className="flex gap-3 pt-1">
                                            <motion.button type="button" onClick={() => setStep(1)} whileTap={{ scale: 0.97 }}
                                                className="flex-1 py-4 glass rounded-2xl font-semibold text-sm text-white/60 hover:text-white transition-colors">
                                                ← Back
                                            </motion.button>
                                            <MagneticButton className="flex-[2] cursor-pointer">
                                                <button type="submit" disabled={loading}
                                                    className="relative w-full py-4 rounded-2xl font-bold text-base overflow-hidden disabled:opacity-60 group">
                                                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                                        {loading ? (
                                                            <>
                                                                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                                                                Creating Account…
                                                            </>
                                                        ) : (
                                                            <>Create Account <span className="group-hover:translate-x-1 transition-transform inline-block">→</span></>
                                                        )}
                                                    </span>
                                                </button>
                                            </MagneticButton>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* Footer */}
                            {!success && (
                                <div className="mt-7 text-center">
                                    <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        Already have an account?{' '}
                                        <Link to="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors underline underline-offset-2">
                                            Sign In
                                        </Link>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security note */}
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                        className="text-center text-xs text-white/20 mt-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        🔒 256-bit encrypted · CERT-In compliant · No data sold
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}