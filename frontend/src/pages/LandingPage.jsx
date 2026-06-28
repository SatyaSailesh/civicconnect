import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Globe from 'react-globe.gl';

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
    { name: 'Features', id: 'features' },
    { name: 'How it Works', id: 'how-it-works' },
    { name: 'Leaders', id: 'leaders' },
    { name: 'Impact', id: 'impact' }
];

const STATS = [
    { label: 'Active Citizens', value: 10847, display: '10K+', suffix: '+', icon: '👥', color: '#10b981' },
    { label: 'Govt Officials', value: 512, display: '500+', suffix: '+', icon: '🏛️', color: '#3b82f6' },
    { label: 'Issues Resolved', value: 5293, display: '5K+', suffix: '+', icon: '✅', color: '#8b5cf6' },
    { label: 'Cities Covered', value: 54, display: '50+', suffix: '+', icon: '🌏', color: '#f59e0b' },
];

const FEATURES = [
    {
        icon: '⚡',
        title: 'Real-time Escalation',
        description: 'Unresolved grievances auto-escalate to higher authorities with full audit trails and time-bound SLAs.',
        tag: 'Automation',
        color: '#f59e0b',
    },
    {
        icon: '🛡️',
        title: 'Aadhaar Verified',
        description: 'Bank-grade identity verification ensures every complaint is authentic, reducing spam by 99.8%.',
        tag: 'Security',
        color: '#10b981',
    },
    {
        icon: '📊',
        title: 'Performance Analytics',
        description: 'Live dashboards track resolution rates, response times, and citizen satisfaction by constituency.',
        tag: 'Insights',
        color: '#3b82f6',
    },
    {
        icon: '📍',
        title: 'Geo-tagged Reports',
        description: 'Pinpoint accuracy with GPS-enabled complaint filing, heat maps, and cluster detection.',
        tag: 'Mapping',
        color: '#8b5cf6',
    },
    {
        icon: '⭐',
        title: 'Leader Rating System',
        description: 'Transparent, crowd-sourced ratings for every MLA, MP, and official based on real outcomes.',
        tag: 'Accountability',
        color: '#ec4899',
    },
    {
        icon: '🔍',
        title: 'Transparent Tracking',
        description: 'Citizens follow every step of their complaint—from filing to resolution—in real time.',
        tag: 'Transparency',
        color: '#06b6d4',
    },
];

const LEADERS = [
    { name: 'Narendra Modi', position: 'Prime Minister of India', rating: 4.8, resolved: 1240, trend: '+12%', party: 'BJP', avatar: 'NM', color: '#f97316' },
    { name: 'Arvind Kejriwal', position: 'Chief Minister, Delhi', rating: 4.7, resolved: 1050, trend: '+8%', party: 'AAP', avatar: 'AK', color: '#10b981' },
    { name: 'Mamata Banerjee', position: 'Chief Minister, WB', rating: 4.5, resolved: 870, trend: '+5%', party: 'AITC', avatar: 'MB', color: '#3b82f6' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Register & Verify', desc: 'Sign up with Aadhaar for a verified, trusted civic identity.', icon: '🪪' },
    { step: '02', title: 'File a Grievance', desc: 'Describe your issue, attach photos, and pin your location on the map.', icon: '📝' },
    { step: '03', title: 'Auto-Assign & Track', desc: 'AI routes your complaint to the right official with a live tracker.', icon: '🤖' },
    { step: '04', title: 'Resolution & Rating', desc: 'Get notified on resolution, then rate the official\'s response.', icon: '🏆' },
];

const TESTIMONIALS = [
    { name: 'Priya Sharma', city: 'New Delhi', avatar: 'PS', text: 'My pothole complaint was fixed in 3 days. I\'ve never seen government work this fast!', rating: 5 },
    { name: 'Rahul Verma', city: 'Mumbai', avatar: 'RV', text: 'Finally a platform where my voice actually matters. The escalation system is brilliant.', rating: 5 },
    { name: 'Anita Patel', city: 'Ahmedabad', avatar: 'AP', text: 'Reported a streetlight issue at 9pm, got a fix confirmation by next morning.', rating: 5 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CountUp({ target, duration = 2000 }) {
    const [count, setCount] = useState(0);
    const ref = useRef();
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [inView, target, duration]);

    return <span ref={ref}>{count.toLocaleString()}</span>;
}

function MagneticButton({ children, className, onClick, href }) {
    const ref = useRef();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 300, damping: 20 });
    const sy = useSpring(y, { stiffness: 300, damping: 20 });
    const navigate = useNavigate();

    const handleMove = (e) => {
        const rect = ref.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        x.set((e.clientX - cx) * 0.25);
        y.set((e.clientY - cy) * 0.25);
    };

    const handleClick = (e) => {
        if (href) {
            if (href.startsWith('http')) {
                window.open(href, '_blank');
            } else if (href.startsWith('#')) {
                e.preventDefault();
                const element = document.getElementById(href.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                navigate(href);
            }
        }
        if (onClick) onClick(e);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ x: sx, y: sy }}
            className={className}
            onClick={handleClick}
        >
            {children}
        </motion.div>
    );
}

// ─── Particle Field ───────────────────────────────────────────────────────────

function ParticleField() {
    const particles = useRef(
        Array.from({ length: 60 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 20 + 10,
            delay: Math.random() * 10,
            opacity: Math.random() * 0.4 + 0.1,
        }))
    ).current;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={`particle-${p.id}`}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: p.id % 3 === 0 ? '#10b981' : p.id % 3 === 1 ? '#3b82f6' : '#8b5cf6',
                        opacity: p.opacity,
                    }}
                    animate={{
                        y: [0, -40, 0],
                        x: [0, Math.random() * 20 - 10, 0],
                        opacity: [p.opacity, p.opacity * 1.5, p.opacity],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Real Globe ───────────────────────────────────────────────────────────────

function IndiaGlobe() {
    const globeRef = useRef();
    const [ready, setReady] = useState(false);

    // Indian cities as points
    const cities = [
        { lat: 28.6139, lng: 77.2090, name: 'New Delhi', color: '#10b981', size: 0.6 },
        { lat: 19.0760, lng: 72.8777, name: 'Mumbai', color: '#3b82f6', size: 0.5 },
        { lat: 12.9716, lng: 77.5946, name: 'Bangalore', color: '#8b5cf6', size: 0.5 },
        { lat: 22.5726, lng: 88.3639, name: 'Kolkata', color: '#f59e0b', size: 0.5 },
        { lat: 17.3850, lng: 78.4867, name: 'Hyderabad', color: '#ec4899', size: 0.45 },
        { lat: 13.0827, lng: 80.2707, name: 'Chennai', color: '#06b6d4', size: 0.45 },
        { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', color: '#10b981', size: 0.4 },
        { lat: 26.9124, lng: 75.7873, name: 'Jaipur', color: '#f59e0b', size: 0.4 },
        { lat: 30.7333, lng: 76.7794, name: 'Chandigarh', color: '#3b82f6', size: 0.4 },
        { lat: 21.1458, lng: 79.0882, name: 'Nagpur', color: '#8b5cf6', size: 0.4 },
    ];

    // Arcs between cities
    const arcs = [
        { startLat: 28.6139, startLng: 77.2090, endLat: 19.0760, endLng: 72.8777, color: '#10b981' },
        { startLat: 28.6139, startLng: 77.2090, endLat: 12.9716, endLng: 77.5946, color: '#3b82f6' },
        { startLat: 28.6139, startLng: 77.2090, endLat: 22.5726, endLng: 88.3639, color: '#8b5cf6' },
        { startLat: 28.6139, startLng: 77.2090, endLat: 17.3850, endLng: 78.4867, color: '#f59e0b' },
        { startLat: 28.6139, startLng: 77.2090, endLat: 13.0827, endLng: 80.2707, color: '#ec4899' },
        { startLat: 19.0760, startLng: 72.8777, endLat: 12.9716, endLng: 77.5946, color: '#06b6d4' },
        { startLat: 19.0760, startLng: 72.8777, endLat: 23.0225, endLng: 72.5714, color: '#10b981' },
        { startLat: 22.5726, startLng: 88.3639, endLat: 13.0827, endLng: 80.2707, color: '#3b82f6' },
        { startLat: 17.3850, startLng: 78.4867, endLat: 13.0827, endLng: 80.2707, color: '#8b5cf6' },
        { startLat: 26.9124, startLng: 75.7873, endLat: 28.6139, endLng: 77.2090, color: '#f59e0b' },
        { startLat: 30.7333, startLng: 76.7794, endLat: 28.6139, endLng: 77.2090, color: '#10b981' },
        { startLat: 21.1458, startLng: 79.0882, endLat: 19.0760, endLng: 72.8777, color: '#ec4899' },
    ];

    useEffect(() => {
        if (globeRef.current) {
            const ctrl = globeRef.current.controls();
            ctrl.autoRotate = true;
            ctrl.autoRotateSpeed = 1.2;
            ctrl.enableZoom = false;
            ctrl.enablePan = false;
            globeRef.current.pointOfView({ lat: 22, lng: 80, altitude: 2.2 }, 0);
            setReady(true);
        }
    }, []);

    return (
        <div className="relative h-[580px] flex items-center justify-center">
            {/* Glow rings behind globe */}
            <div className="absolute w-[440px] h-[440px] rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
            <div className="absolute w-[320px] h-[320px] rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#03070f] to-transparent z-10 pointer-events-none" />
            {/* Side fades */}
            <div className="absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-[#03070f] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-[#03070f] to-transparent z-10 pointer-events-none" />

            <Globe
                ref={globeRef}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl={null}
                backgroundColor="rgba(0,0,0,0)"
                width={520}
                height={520}
                // Points — city dots
                pointsData={cities}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointAltitude={0.05}
                pointRadius="size"
                pointsMerge={false}
                // Arcs — connections
                arcsData={arcs}
                arcStartLat="startLat"
                arcStartLng="startLng"
                arcEndLat="endLat"
                arcEndLng="endLng"
                arcColor="color"
                arcDashLength={0.4}
                arcDashGap={0.2}
                arcDashAnimateTime={2500}
                arcStroke={0.4}
                arcAltitude={0.15}
                // Atmosphere
                atmosphereColor="#10b981"
                atmosphereAltitude={0.18}
                // Rings — pulse on Delhi
                ringsData={[{ lat: 28.6139, lng: 77.2090 }]}
                ringColor={() => '#10b981'}
                ringMaxRadius={4}
                ringPropagationSpeed={2}
                ringRepeatPeriod={1200}
            />

            {/* Floating city chips */}
            {[
                { label: '🟢 New Delhi Active', pos: 'top-16 left-4', delay: 0 },
                { label: '🔵 Mumbai Connected', pos: 'bottom-28 left-0', delay: 1.2 },
                { label: '🟣 Bangalore Online', pos: 'top-1/3 right-2', delay: 2 },
                { label: '🟡 Kolkata Live', pos: 'bottom-40 right-4', delay: 0.7 },
            ].map((chip, index) => (
                <motion.div
                    key={`chip-${index}`}
                    className={`absolute ${chip.pos} z-20 backdrop-blur-md bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/80 whitespace-nowrap pointer-events-none`}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, delay: chip.delay, repeat: Infinity, ease: 'easeInOut' }}
                >
                    {chip.label}
                </motion.div>
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingPage() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const [watchDemoOpen, setWatchDemoOpen] = useState(false);
    const containerRef = useRef();
    const navigate = useNavigate();

    const { scrollYProgress } = useScroll();
    const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const handleNavClick = (sectionId) => {
        setMobileOpen(false);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleWatchDemo = () => {
        setWatchDemoOpen(true);
        // In a real app, you might open a modal or video player
        window.open('https://www.youtube.com/watch?v=demo', '_blank');
    };

    const handleContactSales = () => {
        window.location.href = 'mailto:sales@civicconnect.in?subject=Sales Inquiry';
    };

    // Ticker items - removed duplicate
    const ticker = ['10K+ Citizens', '500+ Officials', '5K+ Resolved', '50+ Cities', '99.8% Spam-Free', 'Aadhaar Verified', 'Real-time Escalation'];

    return (
        <div ref={containerRef} style={{ fontFamily: "'Syne', 'DM Sans', sans-serif" }}
            className="relative min-h-screen bg-[#03070f] text-white overflow-x-hidden">

            {/* ── Scroll Progress ── */}
            <motion.div className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 z-[100]"
                style={{ width: progressWidth }} />

            {/* ── Global Fonts ── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-strong { background: rgba(255,255,255,0.07); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12); }
        .text-gradient { background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .noise::after { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); opacity: 0.3; pointer-events: none; }
        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-inner { display: inline-flex; animation: ticker 30s linear infinite; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .card-hover { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .card-hover:hover { transform: translateY(-6px) scale(1.01); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #03070f; }
        ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 2px; }
      `}</style>

            {/* ── Background ── */}
            <div className="fixed inset-0 pointer-events-none">
                <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.12) 0%, transparent 70%)' }} className="absolute inset-0" />
                <div style={{ background: 'radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} className="absolute inset-0" />
                <div style={{ background: 'radial-gradient(ellipse 50% 40% at 10% 60%, rgba(139,92,246,0.06) 0%, transparent 70%)' }} className="absolute inset-0" />

                {/* Grid */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
                            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#g)" />
                </svg>
                <ParticleField />
            </div>

            {/* ── Watch Demo Modal ── */}
            <AnimatePresence>
                {watchDemoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setWatchDemoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative max-w-4xl w-full bg-[#0a1420] rounded-2xl border border-white/10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="aspect-video bg-black flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">🎥</div>
                                    <h3 className="text-xl font-bold mb-2">Product Demo Video</h3>
                                    <p className="text-white/50 text-sm">Your browser will open a demo video</p>
                                </div>
                            </div>
                            <div className="p-4 flex justify-end">
                                <button
                                    onClick={() => setWatchDemoOpen(false)}
                                    className="px-4 py-2 glass rounded-xl text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Navigation ── */}
            <motion.nav
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}
            >
                <div className={`absolute inset-0 transition-all duration-300 ${scrolled ? 'bg-[#03070f]/90 backdrop-blur-2xl border-b border-white/5' : ''}`} />
                <div className="relative max-w-7xl mx-auto px-6 flex items-center justify-between">
                    {/* Logo */}
                    <motion.div
                        whileHover={{ scale: 1.03 }}
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <div className="relative w-9 h-9">
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-base">🌐</div>
                            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#03070f]" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            Civic<span className="text-emerald-400">Connect</span>
                        </span>
                    </motion.div>

                    {/* Links */}
                    <div className="hidden lg:flex items-center gap-1">
                        {NAV_LINKS.map((item) => (
                            <motion.button
                                key={item.name}
                                onClick={() => handleNavClick(item.id)}
                                whileHover={{ y: -1 }}
                                className="px-4 py-2 text-sm text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                {item.name}
                            </motion.button>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div className="hidden lg:flex items-center gap-3">
                        <Link to="/login">
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                className="px-5 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                                Sign In
                            </motion.button>
                        </Link>
                        <Link to="/register">
                            <MagneticButton className="cursor-pointer">
                                <motion.button whileTap={{ scale: 0.97 }}
                                    className="relative overflow-hidden px-5 py-2.5 rounded-xl text-sm font-semibold text-white group">
                                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative flex items-center gap-1.5">Get Started Free <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span></span>
                                </motion.button>
                            </MagneticButton>
                        </Link>
                    </div>

                    {/* Mobile */}
                    <button onClick={() => setMobileOpen(true)} className="lg:hidden glass p-2.5 rounded-xl">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
            </motion.nav>

            {/* ── Mobile Menu ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-72 bg-[#070f1a] border-l border-white/8 p-6">
                            <div className="flex justify-between items-center mb-8">
                                <span className="font-bold text-lg">Menu</span>
                                <button onClick={() => setMobileOpen(false)} className="glass p-2 rounded-xl">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="space-y-1 mb-6">
                                {NAV_LINKS.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => handleNavClick(item.id)}
                                        className="block w-full text-left py-3 px-4 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-3 pt-4 border-t border-white/8">
                                <Link to="/login" className="block w-full" onClick={() => setMobileOpen(false)}>
                                    <button className="w-full py-3 glass rounded-xl text-sm font-medium">Sign In</button>
                                </Link>
                                <Link to="/register" className="block w-full" onClick={() => setMobileOpen(false)}>
                                    <button className="w-full py-3 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl text-sm font-semibold">Get Started Free</button>
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── HERO ── */}
            {/* ═══════════════════════════════════════════════ */}
            <section className="relative pt-32 lg:pt-40 pb-16 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-6 items-center">

                        {/* Left */}
                        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>

                            {/* Badge */}
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2.5 glass px-4 py-2 rounded-full mb-8">
                                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                                    className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                <span className="text-sm text-white/75 font-medium">India's #1 Civic Intelligence Platform</span>
                                <span className="text-xs text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full">LIVE</span>
                            </motion.div>

                            {/* Heading */}
                            <h1 className="text-5xl lg:text-[4.2rem] xl:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
                                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                    className="block text-white">Bridge the Gap</motion.span>
                                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                                    className="block text-gradient">Between Citizens</motion.span>
                                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                                    className="block text-white/30">&amp; Power</motion.span>
                            </h1>

                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                                className="text-base lg:text-lg text-white/45 mb-10 max-w-md leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                AI-powered grievance tracking, real-time escalation, and transparent governance — built for 1.4 billion voices.
                            </motion.p>

                            {/* CTA Row */}
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
                                className="flex flex-wrap gap-3 mb-12">
                                <Link to="/register">
                                    <MagneticButton className="cursor-pointer">
                                        <button className="group relative overflow-hidden px-7 py-3.5 rounded-2xl font-semibold text-base">
                                            <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                                            <span className="relative flex items-center gap-2">Start Making Impact <span className="group-hover:translate-x-1 transition-transform inline-block">→</span></span>
                                        </button>
                                    </MagneticButton>
                                </Link>
                                <button
                                    onClick={handleWatchDemo}
                                    className="px-7 py-3.5 rounded-2xl glass text-white/70 hover:text-white font-semibold text-base hover:bg-white/8 transition-all flex items-center gap-2"
                                >
                                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">▶</span> Watch Demo
                                </button>
                            </motion.div>

                            {/* Stats Row */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                                className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {STATS.map((s, i) => (
                                    <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.9 + i * 0.07 }}
                                        className="glass rounded-2xl p-4 card-hover cursor-default">
                                        <div className="text-2xl mb-1">{s.icon}</div>
                                        <p className="text-xl font-bold" style={{ color: s.color }}>
                                            <CountUp target={s.value} />+
                                        </p>
                                        <p className="text-[11px] text-white/40 leading-tight">{s.label}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Right – Globe */}
                        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                            className="relative flex items-center justify-center lg:justify-end">
                            <IndiaGlobe />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Ticker ── */}
            <div className="relative z-10 border-y border-white/5 py-3.5 overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#03070f] to-transparent z-10" />
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#03070f] to-transparent z-10" />
                <div className="ticker-wrap">
                    <div className="ticker-inner">
                        {[...ticker, ...ticker].map((t, i) => (
                            <span key={`ticker-${i}`} className="mx-6 text-sm text-white/30 font-medium">
                                <span className="text-emerald-400 mr-2">◆</span>{t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Trusted By ── */}
            <section className="relative z-10 py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                        className="text-center text-white/30 text-xs font-semibold tracking-widest uppercase mb-8">
                        Trusted by leading government bodies
                    </motion.p>
                    <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
                        {['Delhi Govt', 'Digital India', 'Mumbai Civic Corp', 'State Police', 'Jal Shakti'].map((name, i) => (
                            <motion.div key={name} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                whileHover={{ opacity: 1 }}
                                className="text-white/25 text-sm font-semibold tracking-wide hover:text-white/70 transition-colors cursor-default">
                                {name}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── HOW IT WORKS ── */}
            {/* ═══════════════════════════════════════════════ */}
            <section id="how-it-works" className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="text-center mb-16">
                        <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase mb-3">Process</p>
                        <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">
                            How It <span className="text-gradient">Works</span>
                        </h2>
                        <p className="text-white/40 max-w-lg mx-auto text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            From complaint to resolution in four seamless steps
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-4 gap-6 relative">
                        {/* Connector line */}
                        <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {HOW_IT_WORKS.map((step, i) => (
                            <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                                className="relative group card-hover">
                                <div className="glass rounded-3xl p-7 h-full relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.08), transparent 70%)' }} />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-5">
                                            <span className="text-3xl">{step.icon}</span>
                                            <span className="text-4xl font-extrabold text-white/8">{step.step}</span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                                        <p className="text-sm text-white/45 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── FEATURES ── */}
            {/* ═══════════════════════════════════════════════ */}
            <section id="features" className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="text-center mb-16">
                        <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Capabilities</p>
                        <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">
                            Why <span className="text-gradient">Civic Connect</span>
                        </h2>
                        <p className="text-white/40 max-w-2xl mx-auto text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Cutting-edge technology engineered to make democracy more transparent and responsive
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f, i) => (
                            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                className="group relative card-hover">
                                <div className="glass rounded-3xl p-8 h-full relative overflow-hidden">
                                    {/* Corner accent */}
                                    <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                                        style={{ background: f.color }} />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                                                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                                                {f.icon}
                                            </div>
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                                                style={{ color: f.color, borderColor: `${f.color}30`, background: `${f.color}10` }}>
                                                {f.tag}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2.5">{f.title}</h3>
                                        <p className="text-sm text-white/45 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{f.description}</p>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── LEADERS ── */}
            {/* ═══════════════════════════════════════════════ */}
            <section id="leaders" className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-purple-400 uppercase mb-3">Leaderboard</p>
                            <h2 className="text-4xl lg:text-5xl font-extrabold">
                                Top Performing <span className="text-gradient">Leaders</span>
                            </h2>
                        </div>
                        <p className="text-white/40 max-w-sm text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Live performance metrics of elected representatives, updated in real time from citizen reports.
                        </p>
                    </motion.div>

                    {/* Tab selector */}
                    <div className="flex gap-2 mb-8">
                        {['Top Rated', 'Most Resolved', 'Fastest Response'].map((tab, i) => (
                            <button key={tab} onClick={() => setActiveTab(i)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === i
                                    ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white'
                                    : 'glass text-white/50 hover:text-white'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {LEADERS.map((leader, i) => (
                            <motion.div key={leader.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                className="group relative card-hover">
                                {i === 0 && (
                                    <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-400 text-[#03070f] text-xs font-bold px-2.5 py-1 rounded-full">
                                        🏆 #1
                                    </div>
                                )}
                                <div className="glass rounded-3xl p-6 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ background: `radial-gradient(circle at 0% 0%, ${leader.color}12, transparent 60%)` }} />

                                    <div className="relative z-10">
                                        {/* Header */}
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                                                style={{ background: `linear-gradient(135deg, ${leader.color}60, ${leader.color}20)`, border: `1px solid ${leader.color}40` }}>
                                                {leader.avatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-base leading-tight">{leader.name}</h3>
                                                <p className="text-xs text-white/45 mt-0.5">{leader.position}</p>
                                                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                                                    style={{ color: leader.color, background: `${leader.color}15` }}>
                                                    {leader.party}
                                                </span>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <span className="text-yellow-400 text-sm">★</span>
                                                    <span className="font-bold">{leader.rating}</span>
                                                </div>
                                                <p className="text-[10px] text-white/30 mt-0.5">Rating</p>
                                            </div>
                                        </div>

                                        {/* Progress */}
                                        <div className="mb-5">
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-white/40">Issues Resolved</span>
                                                <span className="font-semibold flex items-center gap-1">
                                                    {leader.resolved}
                                                    <span className="text-emerald-400 text-[10px]">{leader.trend}</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} whileInView={{ width: `${(leader.resolved / 1400) * 100}%` }}
                                                    viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                                                    className="h-full rounded-full"
                                                    style={{ background: `linear-gradient(90deg, ${leader.color}, ${leader.color}80)` }} />
                                            </div>
                                        </div>

                                        {/* Metrics */}
                                        <div className="grid grid-cols-3 gap-2 mb-5">
                                            {['Response', 'Approval', 'Active'].map((m, j) => (
                                                <div key={`${leader.name}-${m}`} className="text-center p-2 rounded-xl bg-white/4">
                                                    <p className="text-xs font-bold" style={{ color: leader.color }}>
                                                        {j === 0 ? '2.4d' : j === 1 ? '91%' : '✓'}
                                                    </p>
                                                    <p className="text-[10px] text-white/35 mt-0.5">{m}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => navigate(`/leader/${leader.name.toLowerCase().replace(' ', '-')}`)}
                                            className="w-full py-2.5 glass rounded-2xl text-sm font-medium hover:bg-white/8 transition-all text-white/70 hover:text-white"
                                        >
                                            View Full Profile →
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                        className="text-center mt-8">
                        <button
                            onClick={() => navigate('/leaders')}
                            className="glass px-6 py-3 rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-colors hover:bg-white/8"
                        >
                            View All 500+ Officials →
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── IMPACT ── */}
            {/* ═══════════════════════════════════════════════ */}
            <section id="impact" className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase mb-3">Impact</p>
                            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">
                                Real Change, <span className="text-gradient">Real Numbers</span>
                            </h2>
                            <p className="text-white/45 text-base leading-relaxed mb-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Since launch, CivicConnect has transformed how India's citizens interact with governance — faster resolutions, higher accountability, and measurable outcomes.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Average resolution time', value: '3.2', unit: 'days', icon: '⚡' },
                                    { label: 'Citizen satisfaction', value: '94', unit: '%', icon: '😊' },
                                    { label: 'Spam reduction', value: '99.8', unit: '%', icon: '🛡️' },
                                    { label: 'Officials onboarded', value: '500', unit: '+', icon: '🏛️' },
                                ].map((item, i) => (
                                    <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                        className="glass rounded-2xl p-5 card-hover">
                                        <div className="text-2xl mb-2">{item.icon}</div>
                                        <p className="text-3xl font-extrabold text-gradient">{item.value}<span className="text-lg">{item.unit}</span></p>
                                        <p className="text-xs text-white/40 mt-1 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.label}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Testimonials */}
                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="space-y-4">
                            {TESTIMONIALS.map((t, i) => (
                                <motion.div key={t.name} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                                    className="glass rounded-3xl p-6 card-hover">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center text-sm font-bold flex-shrink-0 border border-white/10">
                                            {t.avatar}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold text-sm">{t.name}</p>
                                                    <p className="text-xs text-white/40">{t.city}</p>
                                                </div>
                                                <div className="flex">
                                                    {Array.from({ length: t.rating }).map((_, j) => (
                                                        <span key={`star-${j}`} className="text-yellow-400 text-xs">★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>"{t.text}"</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            <div className="flex items-center gap-3 px-2 pt-2">
                                <div className="flex -space-x-2">
                                    {['A', 'B', 'C', 'D', 'E'].map((l, idx) => (
                                        <div key={`avatar-${idx}`} className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/40 to-blue-500/40 border-2 border-[#03070f] flex items-center justify-center text-[9px] font-bold">{l}</div>
                                    ))}
                                </div>
                                <p className="text-xs text-white/40"><span className="text-white font-semibold">10,000+</span> verified citizens already reporting</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── CTA ── */}
            {/* ═══════════════════════════════════════════════ */}
            <section className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-[2rem] overflow-hidden">

                        {/* BG */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-[#070f1a] to-blue-900/40" />
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59,130,246,0.15) 0%, transparent 50%)'
                        }} />
                        <div className="absolute inset-0 border border-white/8 rounded-[2rem]" />

                        {/* Dots pattern */}
                        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.3)" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#dots)" />
                        </svg>

                        <div className="relative z-10 text-center py-20 px-6 max-w-3xl mx-auto">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 text-sm text-emerald-400 font-medium">
                                🇮🇳 Join the Civic Revolution
                            </motion.div>

                            <h2 className="text-4xl lg:text-6xl font-extrabold mb-6">
                                Ready to Make a <span className="text-gradient">Difference?</span>
                            </h2>
                            <p className="text-white/45 text-lg mb-10 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Join 10,000+ citizens using CivicConnect to hold leaders accountable and build a better India — one resolved grievance at a time.
                            </p>

                            <div className="flex flex-wrap gap-4 justify-center">
                                <Link to="/register">
                                    <MagneticButton className="cursor-pointer">
                                        <button className="group relative overflow-hidden px-8 py-4 rounded-2xl font-bold text-lg">
                                            <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                                            <span className="relative flex items-center gap-2">Get Started Free <span className="group-hover:translate-x-1 transition-transform inline-block">→</span></span>
                                        </button>
                                    </MagneticButton>
                                </Link>
                                <button
                                    onClick={handleContactSales}
                                    className="px-8 py-4 rounded-2xl glass text-white/70 hover:text-white font-bold text-lg hover:bg-white/8 transition-all"
                                >
                                    Contact Sales
                                </button>
                            </div>

                            <p className="text-white/25 text-xs mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                No credit card required · Free for citizens · Aadhaar verified
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="relative z-10 border-t border-white/5 py-14">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-5 gap-10 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-base">🌐</div>
                                <span className="text-xl font-bold">Civic<span className="text-emerald-400">Connect</span></span>
                            </div>
                            <p className="text-sm text-white/35 leading-relaxed max-w-xs mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Bridging citizens and authorities through transparent, technology-driven governance.
                            </p>
                            <div className="flex gap-3">
                                {['𝕏', 'in', '📘', '📸'].map((icon, i) => (
                                    <button
                                        key={`social-${i}`}
                                        onClick={() => window.open('https://twitter.com/civicconnect', '_blank')}
                                        className="w-9 h-9 glass rounded-xl flex items-center justify-center text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all"
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'API', 'Documentation', 'Changelog'] },
                            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Partners'] },
                            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies', 'Accessibility'] },
                        ].map((col) => (
                            <div key={col.title}>
                                <h4 className="text-sm font-semibold mb-4 text-white/80">{col.title}</h4>
                                <ul className="space-y-2.5">
                                    {col.links.map((link) => (
                                        <li key={`${col.title}-${link}`}>
                                            <button
                                                onClick={() => navigate(`/${link.toLowerCase()}`)}
                                                className="text-sm text-white/35 hover:text-white/80 transition-colors"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                                            >
                                                {link}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-white/25" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            © 2026 CivicConnect Technologies Pvt. Ltd. All rights reserved.
                        </p>
                        <p className="text-xs text-white/25 flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Made with <span className="text-red-400">♥</span> in India · Building a better democracy
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}