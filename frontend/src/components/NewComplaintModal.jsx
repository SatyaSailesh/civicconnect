import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Infrastructure', 'Corruption', 'Scam', 'Public Service'];
const CATEGORY_ICONS = {
    'Infrastructure': '🏗️',
    'Corruption': '⚖️',
    'Scam': '🚨',
    'Public Service': '🏛️',
};

// ─── Reverse geocode using OpenStreetMap Nominatim (free, no API key) ─────────
async function reverseGeocode(lat, lng) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    return {
        fullAddress: data.display_name || '',
        street: [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(', '),
        city: a.city || a.town || a.village || a.county || '',
        district: a.state_district || a.county || '',
        state: a.state || '',
        pincode: a.postcode || '',
    };
}

export default function NewComplaintModal({ isOpen, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'Infrastructure',
        exactAddress: '',
        street: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
        lat: null,
        lng: null,
    });
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState(null);
    const [locState, setLocState] = useState('idle'); // idle | detecting | detected | manual | error
    const [locError, setLocError] = useState('');
    const { user } = useAuth();

    if (!isOpen) return null;

    // ── Aadhaar gate ──
    if (user?.role === 'citizen' && !user?.aadhaarVerified) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full rounded-3xl p-10 text-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl"
                        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>🪪</div>
                    <h2 className="text-2xl font-extrabold mb-3">Aadhaar Verification Required</h2>
                    <p className="text-white/50 mb-8 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        Please verify your Aadhaar before filing complaints.
                    </p>
                    <button onClick={onClose} className="text-sm text-white/40 hover:text-white/70 transition-colors"
                        style={{ fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                </motion.div>
            </div>
        );
    }

    // ── Auto-detect location ──
    const detectLocation = () => {
        if (!navigator.geolocation) {
            setLocError('Geolocation is not supported by your browser.');
            setLocState('error');
            return;
        }
        setLocState('detecting');
        setLocError('');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    const geo = await reverseGeocode(lat, lng);
                    setForm(f => ({
                        ...f,
                        exactAddress: geo.fullAddress,
                        street: geo.street,
                        city: geo.city,
                        district: geo.district,
                        state: geo.state,
                        pincode: geo.pincode,
                        lat, lng,
                    }));
                    setLocState('detected');
                } catch {
                    setLocError('Could not fetch address. Please enter manually.');
                    setLocState('error');
                }
            },
            (err) => {
                const msgs = {
                    1: 'Location permission denied. Please allow location access or enter manually.',
                    2: 'Location unavailable. Please enter manually.',
                    3: 'Location request timed out. Please try again.',
                };
                setLocError(msgs[err.code] || 'Could not get location.');
                setLocState('error');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    const clearLocation = () => {
        setForm(f => ({ ...f, exactAddress: '', street: '', city: '', district: '', state: '', pincode: '', lat: null, lng: null }));
        setLocState('idle');
        setLocError('');
    };

    // ── Image upload ──
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 2) { setError('Maximum 2 images allowed'); return; }
        setImages(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    };

    // ── Submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.title.trim() || !form.description.trim()) {
            setError('Title and description are required.');
            return;
        }
        if (!form.city && !form.exactAddress) {
            setError('Please add a location — use auto-detect or enter manually.');
            return;
        }
        setLoading(true);
        try {
            const locationStr = [form.exactAddress || form.street, form.city, form.district, form.state, form.pincode]
                .filter(Boolean).join(', ');

            // Send as FormData so multer can handle image files on the backend
            const formData = new FormData();
            formData.append('title', form.title.trim());
            formData.append('description', form.description.trim());
            formData.append('category', form.category);
            formData.append('location', locationStr || 'Not specified');
            formData.append('city', form.city || '');
            formData.append('district', form.district || '');
            formData.append('state', form.state || '');
            formData.append('pincode', form.pincode || '');
            if (form.lat) formData.append('lat', form.lat);
            if (form.lng) formData.append('lng', form.lng);
            // Append actual image files for multer
            images.forEach(img => { if (img.file) formData.append('images', img.file); });

            await api.post('/complaints', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setForm({ title: '', description: '', category: 'Infrastructure', exactAddress: '', street: '', city: '', district: '', state: '', pincode: '', lat: null, lng: null });
            setImages([]);
            setLocState('idle');
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Complaint error:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to create complaint. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (field) => ({
        background: focusedField === field ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${focusedField === field ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        padding: '11px 14px',
        width: '100%',
        outline: 'none',
        color: 'white',
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 13,
        transition: 'all 0.2s ease',
        boxShadow: focusedField === field ? '0 0 0 3px rgba(16,185,129,0.08)' : 'none',
    });

    const locationDetected = locState === 'detected';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                style={{ fontFamily: "'Syne','DM Sans',sans-serif" }}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

                <div className="absolute inset-0" onClick={onClose} />

                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 16 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-lg rounded-3xl overflow-hidden"
                    style={{ background: 'rgba(10,16,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', maxHeight: '92vh', overflowY: 'auto' }}
                    onClick={e => e.stopPropagation()}>

                    {/* ── Header ── */}
                    <div className="sticky top-0 z-10 flex justify-between items-center px-7 py-5"
                        style={{ background: 'rgba(10,16,30,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs text-emerald-400 font-medium mb-1">
                                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                New Complaint
                            </div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">File a Grievance</h2>
                        </div>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.06)' }}>✕</motion.button>
                    </div>

                    {/* ── Form ── */}
                    <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

                        {/* Error banner */}
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-start gap-3 p-3.5 rounded-2xl overflow-hidden"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <span className="text-red-400 flex-shrink-0">⚠</span>
                                    <p className="text-red-400 text-sm" style={{ fontFamily: "'DM Sans',sans-serif" }}>{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2.5"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Title *</label>
                            <input type="text" required value={form.title}
                                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError(''); }}
                                onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)}
                                style={inputStyle('title')} placeholder="e.g. Broken street light on MG Road" />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2.5"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Category *</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map(cat => (
                                    <motion.button key={cat} type="button" whileTap={{ scale: 0.97 }}
                                        onClick={() => setForm(f => ({ ...f, category: cat }))}
                                        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium text-left transition-all duration-200"
                                        style={{
                                            background: form.category === cat ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${form.category === cat ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                            color: form.category === cat ? '#10b981' : 'rgba(255,255,255,0.55)',
                                            fontFamily: "'DM Sans',sans-serif",
                                        }}>
                                        <span className="text-base">{CATEGORY_ICONS[cat]}</span> {cat}
                                        {form.category === cat && <span className="ml-auto text-[10px]">✓</span>}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2.5"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Description *</label>
                            <textarea required value={form.description}
                                onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setError(''); }}
                                onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField(null)}
                                style={{ ...inputStyle('desc'), height: 100, resize: 'vertical' }}
                                placeholder="Describe the issue in detail..." />
                            <p className="text-[10px] text-white/20 mt-1 text-right"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>{form.description.length} chars</p>
                        </div>

                        {/* ══════════════════════════════════════════ */}
                        {/* ── LOCATION SECTION ── */}
                        {/* ══════════════════════════════════════════ */}
                        <div>
                            <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-3"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Location *</label>

                            {/* Auto-detect button */}
                            {locState === 'idle' || locState === 'error' ? (
                                <div className="space-y-3">
                                    <motion.button type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                                        onClick={detectLocation}
                                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all"
                                        style={{
                                            background: 'rgba(16,185,129,0.08)',
                                            border: '1px solid rgba(16,185,129,0.25)',
                                            color: '#10b981',
                                            fontFamily: "'DM Sans',sans-serif",
                                        }}>
                                        <span className="text-lg">📍</span>
                                        Auto-detect My Location
                                        <span className="text-xs text-emerald-400/60 ml-1">(GPS)</span>
                                    </motion.button>

                                    {locError && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="text-xs text-amber-400 text-center px-2"
                                            style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                            ⚠ {locError}
                                        </motion.p>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                        <span className="text-xs text-white/20" style={{ fontFamily: "'DM Sans',sans-serif" }}>or enter manually</span>
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    </div>

                                    {/* Manual entry */}
                                    <div>
                                        <input type="text" value={form.exactAddress}
                                            onChange={e => setForm(f => ({ ...f, exactAddress: e.target.value }))}
                                            onFocus={() => setFocusedField('addr')} onBlur={() => setFocusedField(null)}
                                            style={inputStyle('addr')}
                                            placeholder="Exact address (House no., Street, Area...)" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" value={form.city}
                                            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                            onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField(null)}
                                            style={inputStyle('city')} placeholder="City" />
                                        <input type="text" value={form.district}
                                            onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                                            onFocus={() => setFocusedField('dist')} onBlur={() => setFocusedField(null)}
                                            style={inputStyle('dist')} placeholder="District" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" value={form.state}
                                            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                                            onFocus={() => setFocusedField('state')} onBlur={() => setFocusedField(null)}
                                            style={inputStyle('state')} placeholder="State" />
                                        <input type="text" value={form.pincode}
                                            onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                                            onFocus={() => setFocusedField('pin')} onBlur={() => setFocusedField(null)}
                                            style={inputStyle('pin')} placeholder="Pincode" />
                                    </div>
                                </div>

                            ) : locState === 'detecting' ? (
                                // Detecting animation
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-8 rounded-2xl gap-3"
                                    style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                        className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full" />
                                    <p className="text-sm text-emerald-400 font-medium" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        Detecting your location…
                                    </p>
                                    <p className="text-xs text-white/25" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                        Please allow location access if prompted
                                    </p>
                                </motion.div>

                            ) : (
                                // Detected — show result + allow editing
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-2xl overflow-hidden"
                                    style={{ border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.04)' }}>

                                    {/* Detected header */}
                                    <div className="flex items-center justify-between px-4 py-3"
                                        style={{ borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">📍</span>
                                            <span className="text-xs font-semibold text-emerald-400"
                                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Location Detected</span>
                                            {form.lat && (
                                                <span className="text-[10px] text-white/20 font-mono"
                                                    style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                    {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                                                </span>
                                            )}
                                        </div>
                                        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={clearLocation}
                                            className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg"
                                            style={{ fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.04)' }}>
                                            ✕ Clear
                                        </motion.button>
                                    </div>

                                    {/* Editable fields — pre-filled from GPS */}
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <label className="block text-[10px] text-white/25 mb-1.5 uppercase tracking-wider"
                                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Exact Address</label>
                                            <input type="text" value={form.exactAddress}
                                                onChange={e => setForm(f => ({ ...f, exactAddress: e.target.value }))}
                                                onFocus={() => setFocusedField('addr')} onBlur={() => setFocusedField(null)}
                                                style={{ ...inputStyle('addr'), fontSize: 12 }}
                                                placeholder="Edit if needed..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { key: 'street', label: 'Street / Area' },
                                                { key: 'city', label: 'City' },
                                                { key: 'district', label: 'District' },
                                                { key: 'state', label: 'State' },
                                                { key: 'pincode', label: 'Pincode' },
                                            ].map(({ key, label }) => (
                                                key === 'street' ? (
                                                    <div key={key} className="col-span-2">
                                                        <label className="block text-[10px] text-white/25 mb-1.5 uppercase tracking-wider"
                                                            style={{ fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
                                                        <input type="text" value={form[key]}
                                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                            onFocus={() => setFocusedField(key)} onBlur={() => setFocusedField(null)}
                                                            style={{ ...inputStyle(key), fontSize: 12 }} placeholder={label} />
                                                    </div>
                                                ) : (
                                                    <div key={key}>
                                                        <label className="block text-[10px] text-white/25 mb-1.5 uppercase tracking-wider"
                                                            style={{ fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
                                                        <input type="text" value={form[key]}
                                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                            onFocus={() => setFocusedField(key)} onBlur={() => setFocusedField(null)}
                                                            style={{ ...inputStyle(key), fontSize: 12 }} placeholder={label} />
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-white/20" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                            ✏️ You can edit any field above to add more detail (e.g. flat number, landmark)
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-xs font-semibold text-white/35 uppercase tracking-widest mb-2.5"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                Attach Photos <span className="normal-case text-white/20">(max 2, optional)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {images.map((img, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        className="relative rounded-2xl overflow-hidden aspect-video"
                                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                                        <motion.button type="button" whileHover={{ scale: 1.1 }} onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                            style={{ background: '#ef4444' }}>✕</motion.button>
                                        <div className="absolute bottom-0 left-0 right-0 py-1.5 text-center text-[10px] text-white/60"
                                            style={{ background: 'rgba(0,0,0,0.5)', fontFamily: "'DM Sans',sans-serif" }}>Photo {i + 1}</div>
                                    </motion.div>
                                ))}
                                {images.length < 2 && (
                                    <label className="flex flex-col items-center justify-center aspect-video rounded-2xl cursor-pointer transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5"
                                        style={{ border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                                        <span className="text-2xl mb-2">📸</span>
                                        <span className="text-xs text-white/35" style={{ fontFamily: "'DM Sans',sans-serif" }}>Click to upload</span>
                                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 pb-1">
                            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onClose}
                                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white/60 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif" }}>
                                Cancel
                            </motion.button>
                            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                                className="flex-[2] py-3.5 rounded-2xl text-sm font-bold relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed">
                                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                    {loading ? (
                                        <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                                            Submitting…</>
                                    ) : <>Submit Complaint →</>}
                                </span>
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}