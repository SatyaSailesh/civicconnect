import { useState } from 'react';
import { useAuth } from '../context/auth';
import api from '../services/api';

export default function MapThemeControl() {
    const { user, updateUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const theme = user?.mapTheme === 'dark' ? 'dark' : 'light';
    async function changeTheme(next) {
        if (next === theme || saving) return;
        setSaving(true);
        setError('');
        try {
            const { data } = await api.put('/auth/preferences', { mapTheme: next });
            updateUser(data.user);
        } catch (error) { setError(error.response?.data?.message || 'Could not save map appearance. Please retry.'); }
        finally { setSaving(false); }
    }
    return <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
        <div role="group" aria-label="Map appearance" className="inline-flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            {['light', 'dark'].map(value => <button key={value} type="button" aria-pressed={theme === value} disabled={saving}
                onClick={() => changeTheme(value)} className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                style={{ color: theme === value ? '#fff' : 'rgba(255,255,255,0.6)', background: theme === value ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'transparent' }}>
                {value === 'light' ? 'Light map' : 'Dark map'}
            </button>)}
        </div>
        {saving && <p role="status" className="text-xs text-white/60 mt-2">Saving map appearance…</p>}
        {error && <p role="alert" className="text-xs text-red-300 mt-2">{error}</p>}
    </div>;
}
