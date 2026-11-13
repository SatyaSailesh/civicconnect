import { Link } from 'react-router-dom';
import FollowComplaint from './FollowComplaint';

export default function DuplicateSuggestions({ result, loading, error, onContinue, continued }) {
    if (loading) return <p role="status" className="text-xs text-white/60">Checking nearby open reports…</p>;
    if (error) return <p role="status" className="text-xs text-amber-300">Nearby reports could not be checked. You may continue submitting a new report.</p>;
    if (!result) return <p className="text-xs text-white/50">Choose a location pin to check nearby reports before submitting.</p>;
    return <section className="rounded-2xl border border-white/10 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Possible matches within {result.radiusMeters} m</h3>
        {!result.matches.length && <p className="text-xs text-white/60">No accessible open reports in this category were found nearby.</p>}
        {result.matches.map(complaint => <div key={complaint._id} className="border-t border-white/10 pt-3 space-y-2">
            <p className="text-sm text-white">{complaint.title}</p><p className="text-xs text-white/60">{complaint.complaintId} · {complaint.distanceMeters} m · {complaint.status}</p>
            <Link target="_blank" rel="noopener noreferrer" to={`${complaint.isPublic ? '/feed' : '/citizen'}?tracking=${encodeURIComponent(complaint.complaintId)}`} className="text-xs text-emerald-300 underline">Open {complaint.isPublic ? 'public report' : 'your report'}</Link>
            <FollowComplaint complaint={complaint} />
        </div>)}
        {result.matches.length > 0 && <button type="button" onClick={onContinue} className="rounded-xl px-3 py-2 text-xs bg-white/5 text-white/80 border border-white/10">{continued ? 'Continuing with a new report' : 'Continue with a new report'}</button>}
    </section>;
}
