import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Icons = {
    dashboard: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    complaints: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    users: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    analytics: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    settings: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    logout: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    menu: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    x: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    bell: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    search: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    feed: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    profile: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    chevronLeft: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    chevronRight: p => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
};

export default function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [search, setSearch] = useState('');
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = user?.role === 'admin';

    // ── Nav items — fixed: lowercase role check ──
    const navItems = [
        { name: 'Dashboard', icon: Icons.dashboard, path: isAdmin ? '/admin' : '/citizen' },
        { name: 'My Profile', icon: Icons.profile, path: '/profile', citizenOnly: true },
        { name: 'Public Feed', icon: Icons.feed, path: '/feed' },
        ...(isAdmin ? [
            { name: 'Analytics', icon: Icons.analytics, path: '/analytics' },
            { name: 'Citizens', icon: Icons.users, path: '/admin/citizens' },
        ] : []),
        { name: 'Settings', icon: Icons.settings, path: '/settings' },
    ];

    const handleLogout = () => { logout(); navigate('/login'); };

    const isActive = (path) => location.pathname === path;

    const NavItem = ({ item, collapsed }) => (
        <Link to={item.path} onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative"
            style={{
                background: isActive(item.path) ? 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(59,130,246,0.15))' : 'transparent',
                border: isActive(item.path) ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
                color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.45)',
            }}>
            {/* Active indicator */}
            {isActive(item.path) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg,#10b981,#3b82f6)' }} />
            )}
            <item.icon className="w-5 h-5 flex-shrink-0"
                style={{ color: isActive(item.path) ? '#10b981' : 'rgba(255,255,255,0.4)' }} />
            {!collapsed && (
                <span className="text-sm font-semibold truncate" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                    {item.name}
                </span>
            )}
            {/* Tooltip when collapsed */}
            {collapsed && (
                <div className="absolute left-14 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {item.name}
                </div>
            )}
        </Link>
    );

    const SidebarContent = ({ collapsed = false }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} mb-8 px-1`}>
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>⚡</div>
                {!collapsed && (
                    <div>
                        <p className="text-sm font-extrabold text-white tracking-tight">CivicConnect</p>
                        <p className="text-[10px] text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                            {isAdmin ? 'Authority Portal' : 'Citizen Portal'}
                        </p>
                    </div>
                )}
            </div>

            {/* User card */}
            {!collapsed && (
                <div className="mb-6 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>
                            {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-[11px] text-white/35 truncate" style={{ fontFamily: "'DM Sans',sans-serif" }}>{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: isAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)', color: isAdmin ? '#8b5cf6' : '#3b82f6' }}>
                            {isAdmin ? '🏛️ Admin' : '🧑‍💼 Citizen'}
                        </span>
                        {user?.aadhaarVerified && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                                🪪 Verified
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 space-y-1">
                {navItems.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} />)}
            </nav>

            {/* Logout */}
            <button onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all mt-4 w-full"
                style={{ color: 'rgba(239,68,68,0.7)', fontFamily: "'DM Sans',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Icons.logout className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-semibold">Logout</span>}
            </button>
        </div>
    );

    return (
        <div className="min-h-screen" style={{ background: '#03070f', fontFamily: "'Syne','DM Sans',sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .glass { background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(16,185,129,0.3); border-radius:99px; }
      `}</style>

            {/* ── Background glows ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-8"
                    style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)', filter: 'blur(60px)', transform: 'translate(-30%,-30%)' }} />
                <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-6"
                    style={{ background: 'radial-gradient(circle,#3b82f6,transparent 70%)', filter: 'blur(80px)', transform: 'translate(30%,30%)' }} />
            </div>

            {/* ── Mobile top bar ── */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
                style={{ background: 'rgba(3,7,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setMobileOpen(true)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Icons.menu className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
                        style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>⚡</div>
                    <span className="text-sm font-extrabold text-white">CivicConnect</span>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>
                    {(user?.name || 'U')[0].toUpperCase()}
                </div>
            </div>

            {/* ── Mobile sidebar overlay ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 lg:hidden" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setMobileOpen(false)}>
                        <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="w-72 h-full p-6 overflow-y-auto"
                            style={{ background: 'rgba(10,16,30,0.98)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => setMobileOpen(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/40"
                                style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <Icons.x className="w-4 h-4" />
                            </button>
                            <SidebarContent collapsed={false} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Desktop sidebar ── */}
            <motion.div animate={{ width: sidebarOpen ? 260 : 72 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 px-4 py-6"
                style={{ background: 'rgba(10,16,30,0.95)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <SidebarContent collapsed={!sidebarOpen} />

                {/* Toggle button — sits on the right edge of the sidebar, always visible */}
                <motion.button onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute right-0 top-24 w-7 h-7 rounded-full flex items-center justify-center z-50"
                    style={{
                        background: '#0d1825',
                        border: '1px solid rgba(16,185,129,0.4)',
                        boxShadow: '0 0 12px rgba(16,185,129,0.15)',
                        transform: 'translateX(50%)',
                    }}
                    whileHover={{ scale: 1.15, boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}
                    whileTap={{ scale: 0.9 }}>
                    {sidebarOpen
                        ? <Icons.chevronLeft className="w-3.5 h-3.5 text-emerald-400" />
                        : <Icons.chevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                </motion.button>
            </motion.div>

            {/* ── Main content ── */}
            <motion.div animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:block min-h-screen">

                {/* Top bar */}
                <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4"
                    style={{ background: 'rgba(3,7,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Search */}
                    <div className="relative max-w-sm w-full">
                        <Icons.search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search complaints..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm text-white placeholder-white/25 outline-none transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: "'DM Sans',sans-serif" }} />
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
                        {/* Live indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            <span className="text-xs text-emerald-400 font-semibold" style={{ fontFamily: "'DM Sans',sans-serif" }}>Live</span>
                        </div>

                        {/* Bell */}
                        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <Icons.bell className="w-4 h-4 text-white/50" />
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white">3</span>
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white cursor-pointer"
                            style={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}
                            onClick={() => navigate('/profile')}>
                            {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <main className="p-8">{children}</main>
            </motion.div>

            {/* Mobile main content */}
            <div className="lg:hidden pt-16 min-h-screen">
                <main className="p-4">{children}</main>
            </div>
        </div>
    );
}