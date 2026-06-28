import { motion } from 'framer-motion';

const STEPS = [
    { level: 1, name: 'Citizen', authority: 'Local Office', icon: '🧑‍💼', color: '#10b981' },
    { level: 2, name: 'Officer', authority: 'Municipal Officer', icon: '👮', color: '#3b82f6' },
    { level: 3, name: 'MLA', authority: 'Legislative Assembly', icon: '🏛️', color: '#8b5cf6' },
    { level: 4, name: 'CM', authority: 'Chief Minister', icon: '⭐', color: '#ef4444' },
];

export default function EscalationTimeline({ escalationLevel = 1, status }) {
    const current = Math.min(Math.max(escalationLevel, 1), 4);
    const resolved = status === 'Resolved';

    return (
        <div className="w-full">
            <div className="flex items-start justify-between relative">

                {/* Connector track */}
                <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((current - 1) / 3) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        style={{ background: `linear-gradient(90deg, #10b981, ${STEPS[current - 1]?.color})` }} />
                </div>

                {STEPS.map((step, i) => {
                    const done = i + 1 < current;
                    const active = i + 1 === current;
                    const pending = i + 1 > current;

                    return (
                        <div key={step.level} className="flex-1 flex flex-col items-center relative z-10">
                            {/* Circle */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.15, duration: 0.4 }}
                                className="relative">

                                {/* Pulse ring for active */}
                                {active && !resolved && (
                                    <motion.div
                                        animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                                        className="absolute inset-0 rounded-full"
                                        style={{ background: step.color, opacity: 0.3 }} />
                                )}

                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base relative z-10"
                                    style={{
                                        background: done || (active && resolved)
                                            ? `linear-gradient(135deg, ${step.color}, ${step.color}cc)`
                                            : active
                                                ? `rgba(${step.color === '#10b981' ? '16,185,129' : step.color === '#3b82f6' ? '59,130,246' : step.color === '#8b5cf6' ? '139,92,246' : '239,68,68'},0.15)`
                                                : 'rgba(255,255,255,0.05)',
                                        border: `2px solid ${done || (active && resolved) ? step.color : active ? step.color : 'rgba(255,255,255,0.1)'}`,
                                        boxShadow: active && !resolved ? `0 0 16px ${step.color}40` : 'none',
                                    }}>
                                    {done || (active && resolved) ? (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className={pending ? 'opacity-30' : ''}>{step.icon}</span>
                                    )}
                                </div>
                            </motion.div>

                            {/* Labels */}
                            <motion.div className="mt-3 text-center"
                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.15 + 0.2 }}>
                                <p className="text-xs font-bold"
                                    style={{ color: pending ? 'rgba(255,255,255,0.25)' : done || active ? 'white' : 'white' }}>
                                    {step.name}
                                </p>
                                <p className="text-[10px] mt-0.5 hidden sm:block"
                                    style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'DM Sans',sans-serif" }}>
                                    {step.authority}
                                </p>
                                {active && !resolved && (
                                    <motion.span
                                        animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                                        style={{ background: `${step.color}20`, color: step.color, fontFamily: "'DM Sans',sans-serif" }}>
                                        ACTIVE
                                    </motion.span>
                                )}
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            {/* Status message */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="mt-5 text-center">
                {resolved ? (
                    <p className="text-sm font-semibold" style={{ color: '#10b981', fontFamily: "'DM Sans',sans-serif" }}>
                        ✅ Resolved at Level {current} — {STEPS[current - 1]?.authority}
                    </p>
                ) : current > 1 ? (
                    <p className="text-xs" style={{ color: 'rgba(239,68,68,0.7)', fontFamily: "'DM Sans',sans-serif" }}>
                        ⚠ Escalated to {STEPS[current - 1]?.authority} — awaiting response
                    </p>
                ) : (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'DM Sans',sans-serif" }}>
                        Filed at local level — pending review
                    </p>
                )}
            </motion.div>
        </div>
    );
}