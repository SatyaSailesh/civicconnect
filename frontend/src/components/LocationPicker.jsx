import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/auth';
import './MapTheme.css';

export default function LocationPicker({ lat, lng, onChange }) {
    const { user } = useAuth();
    const container = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => {
        const map = L.map(container.current).setView([20.5937, 78.9629], 5);
        mapRef.current = map;
        L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            className: 'civic-basemap-tiles', maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).on('tileerror', () => setUnavailable(true)).addTo(map);
        map.on('click', event => onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }));
        return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    }, []);
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (lat == null || lng == null || lat === '' || lng === '') {
            if (markerRef.current) map.removeLayer(markerRef.current);
            markerRef.current = null;
            return;
        }
        const coords = [Number(lat), Number(lng)];
        if (!coords.every(Number.isFinite) || Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180) return;
        if (!markerRef.current) {
            const icon = L.divIcon({ className: '', html: '<span style="display:block;width:16px;height:16px;background:#10b981;border:2px solid white;border-radius:50%"></span>', iconSize: [16, 16], iconAnchor: [8, 8] });
            markerRef.current = L.marker(coords, { draggable: true, icon }).addTo(map);
            markerRef.current.on('dragend', () => {
                const point = markerRef.current.getLatLng();
                onChangeRef.current({ lat: point.lat, lng: point.lng });
            });
        } else markerRef.current.setLatLng(coords);
        map.panTo(coords);
    }, [lat, lng]);
    return <div data-map-theme={user?.mapTheme === 'dark' ? 'dark' : 'light'}>
        <div ref={container} aria-label="Choose complaint location on map" className="rounded-2xl border border-white/10" style={{ height: 220 }} />
        <p className="text-xs text-white/60 mt-2">Click the map or drag the pin. You can also enter exact coordinates below.</p>
        {unavailable && <p role="status" className="text-xs text-amber-300">Map tiles are unavailable. You can still enter coordinates or a written address.</p>}
    </div>;
}
