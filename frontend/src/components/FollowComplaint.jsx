import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import api from '../services/api';

export default function FollowComplaint({ complaint }) {
    const { user, updateUser } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const following = user?.followedComplaints?.includes(complaint._id);
    async function toggle() {
        setBusy(true); setError('');
        try {
            const { data } = await api.post(`/complaints/${complaint._id}/follow`, { following: !following });
            updateUser(previous => ({ ...previous, followedComplaints: data.followedComplaints }));
        } catch (error) { setError(error.response?.data?.message || 'Could not change following. Please retry.'); }
        finally { setBusy(false); }
    }
    return <div onClick={event => event.stopPropagation()}>
        {user ? <button type="button" aria-pressed={Boolean(following)} disabled={busy} onClick={toggle} className="rounded-xl px-3 py-2 text-xs font-semibold bg-emerald-500/10 text-emerald-300 disabled:opacity-50">{busy ? 'Saving…' : following ? 'Following — unfollow' : 'Follow progress'}</button> : <Link className="text-xs text-emerald-300 underline" to="/login">Sign in to follow</Link>}
        {error && <p role="alert" className="text-xs text-red-300 mt-2">{error}</p>}
    </div>;
}
