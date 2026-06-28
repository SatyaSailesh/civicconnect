import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AadhaarVerifyModal({ isOpen, onClose, onVerified }) {
    const [aadhaar, setAadhaar] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { updateAadhaarVerification } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const digits = aadhaar.replace(/\s/g, '');
        if (digits.length !== 12) {
            setError('Please enter a valid 12-digit Aadhaar number.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/verify-aadhaar', { aadhaarNumber: digits });
            setSuccess(true);
            setTimeout(() => { onVerified?.(); onClose(); }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Check your Aadhaar number.');
        } finally {
            setLoading(false);
        }
    };

    // Format Aadhaar as XXXX XXXX XXXX
    const formatAadhaar = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 12);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ fontFamily: "'Syne','DM Sans',sans-serif" }}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm rounded-3xl overflow-hidden"
                style={{ background: 'rgba(10,16,30,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="px-7 pt-7 pb-5 text-center">
                    <motion.div animate={success ? { scale: [1, 1.2, 1] } : {}}
                        className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl"
                        style={{ background: success ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)', border: `1px solid ${success ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}` }}>
                        {success ? '✅' : '🪪'}
                    </motion.div>
                    <h2 className="text-xl font-extrabold text-white mb-2">
                        {success ? 'Aadhaar Verified!' : 'Verify Your Aadhaar'}
                    </h2>
                    <p className="text-sm text-white/40 leading-relaxed" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                        {success
                            ? 'You can now file complaints on CivicConnect.'
                            : 'Enter your 12-digit Aadhaar number. It will be matched against our verified records.'}
                    </p>
                </div>

                {!success && (
                    <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-start gap-2 p-3 rounded-2xl overflow-hidden"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
                                    <p className="text-red-400 text-xs" style={{ fontFamily: "'DM Sans',sans-serif" }}>{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label className="block text-xs font-semibold text-white/30 uppercase tracking-widest mb-2.5"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>Aadhaar Number</label>
                            <input
                                type="text" value={aadhaar} inputMode="numeric"
                                onChange={e => { setAadhaar(formatAadhaar(e.target.value)); setError(''); }}
                                placeholder="XXXX XXXX XXXX"
                                className="w-full px-4 py-3.5 rounded-2xl text-white text-center text-xl font-bold tracking-widest outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontFamily: "'DM Sans',sans-serif",
                                    letterSpacing: '0.15em',
                                }} />
                            <p className="text-[10px] text-white/20 text-center mt-2"
                                style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                {aadhaar.replace(/\s/g, '').length}/12 digits
                            </p>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/40 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'DM Sans',sans-serif" }}>
                                Cancel
                            </button>
                            <motion.button type="submit" disabled={loading || aadhaar.replace(/\s/g, '').length !== 12}
                                whileTap={{ scale: 0.97 }}
                                className="flex-[2] py-3 rounded-2xl text-sm font-bold relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed">
                                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
                                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                    {loading ? (
                                        <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" /> Verifying…</>
                                    ) : 'Verify Aadhaar →'}
                                </span>
                            </motion.button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}