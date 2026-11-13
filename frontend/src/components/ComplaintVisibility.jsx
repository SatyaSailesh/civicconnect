import { useState } from 'react';
import api from '../services/api';

export default function ComplaintVisibility({ complaint, onChange }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function update() {
        setBusy(true);
        setError('');
        try {
            const { data } = await api.patch(`/complaints/${complaint._id}/visibility`, { isPublic: !complaint.isPublic });
            onChange(data);
        } catch (error) { setError(error.response?.data?.message || 'Could not update sharing. Please retry.'); }
        finally { setBusy(false); }
    }
    return <section className="mb-5 rounded-xl border border-white/10 p-4">
        <h4 className="font-semibold text-sm">{complaint.isPublic ? 'Shared publicly' : 'Private complaint'}</h4>
        <p className="text-xs text-white/60 my-2">Sharing publishes your name, description, address, photos and resolution feedback. Private chat stays private. Making it private removes it from future public feed requests; already viewed copies cannot be recalled.</p>
        <button type="button" onClick={update} disabled={busy} className="rounded-lg px-3 py-2 bg-emerald-500/15 text-emerald-300 text-sm disabled:opacity-50">
            {busy ? 'Saving sharing…' : complaint.isPublic ? 'Make private' : 'Share on public feed'}
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </section>;
}
