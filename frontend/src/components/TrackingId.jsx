import { useState } from 'react';

export default function TrackingId({ value }) {
    const [message, setMessage] = useState('');
    if (!value) return null;
    async function copy(event) {
        event.stopPropagation();
        try { await navigator.clipboard.writeText(value); setMessage('Copied'); }
        catch { setMessage('Select the ID to copy it manually'); }
    }
    return <span className="inline-flex flex-wrap items-center gap-2 text-xs text-emerald-300">
        <span className="select-all font-mono">{value}</span>
        <button type="button" onClick={copy} className="underline" aria-label={`Copy tracking ID ${value}`}>Copy ID</button>
        <span role="status">{message}</span>
    </span>;
}
