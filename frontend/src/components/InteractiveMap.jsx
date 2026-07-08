import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom CSS to pulse marker animations and style popups
const mapStyles = `
  .custom-map-popup .leaflet-popup-content-wrapper {
    background: rgba(10, 16, 30, 0.95);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    border-radius: 16px;
    padding: 6px;
  }
  .custom-map-popup .leaflet-popup-tip {
    background: rgba(10, 16, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .custom-map-popup .leaflet-popup-close-button {
    color: rgba(255, 255, 255, 0.5) !important;
    padding: 8px !important;
  }
  .custom-map-popup .leaflet-popup-close-button:hover {
    color: #ffffff !important;
  }
`;

export default function InteractiveMap({ complaints = [], isCitizen = false }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);

    // Inject custom popup styles
    useEffect(() => {
        const id = 'leaflet-custom-styles';
        if (!document.getElementById(id)) {
            const style = document.createElement('style');
            style.id = id;
            style.innerHTML = mapStyles;
            document.head.appendChild(style);
        }
    }, []);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize map if not already done
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                zoomControl: true,
                attributionControl: false
            }).setView([20.5937, 78.9629], 5); // Default center on India

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 20
            }).addTo(mapRef.current);
        }

        const map = mapRef.current;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Filter valid complaints that contain coordinates
        const validComplaints = complaints.filter(c => {
            const lat = Number(c.lat);
            const lng = Number(c.lng);
            return c.lat !== null && c.lng !== null && !isNaN(lat) && !isNaN(lng);
        });

        if (validComplaints.length > 0) {
            const bounds = [];

            validComplaints.forEach(c => {
                const lat = Number(c.lat);
                const lng = Number(c.lng);

                // Define marker colors:
                // Pending -> Orange (#f59e0b)
                // In Progress -> Blue (#3b82f6)
                // Resolved -> Green (#10b981)
                // Escalated -> Red (#ef4444) (escalationLevel > 1)
                let color = '#f59e0b';
                if (c.escalationLevel > 1) {
                    color = '#ef4444';
                } else if (c.status === 'Resolved') {
                    color = '#10b981';
                } else if (c.status === 'In Progress') {
                    color = '#3b82f6';
                }

                // Custom premium divIcon
                const markerHtml = `
                    <div style="
                        background-color: ${color};
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        border: 2.5px solid #ffffff;
                        box-shadow: 0 0 10px ${color}, 0 0 4px rgba(0,0,0,0.6);
                    "></div>
                `;

                const customIcon = L.divIcon({
                    html: markerHtml,
                    className: 'custom-leaflet-marker',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                // Generate popup contents based on viewer role
                const dateStr = new Date(c.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                const popupContent = isCitizen ? `
                    <div style="font-family: 'DM Sans', sans-serif; color: #f8fafc; line-height: 1.5; font-size: 12px; width: 220px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">${c.title}</h4>
                        <div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">
                            <span style="color: rgba(255,255,255,0.4);">Tracking ID:</span>
                            <span style="font-family: monospace; font-weight: 600; color: #3b82f6;">${c.complaintId || '—'}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Category:</span>
                            <span>${c.category}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Status:</span>
                            <span style="color: ${color}; font-weight: 700;">● ${c.status}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Priority:</span>
                            <span style="font-weight: 600;">${c.priority}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Created:</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                ` : `
                    <div style="font-family: 'DM Sans', sans-serif; color: #f8fafc; line-height: 1.5; font-size: 12px; width: 220px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">${c.title}</h4>
                        <div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">
                            <span style="color: rgba(255,255,255,0.4);">ID:</span>
                            <span style="font-family: monospace; font-weight: 600; color: #3b82f6;">${c.complaintId || '—'}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Citizen:</span>
                            <span>${c.user?.name || c.citizenName || 'Citizen'}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Category:</span>
                            <span>${c.category}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Status:</span>
                            <span style="color: ${color}; font-weight: 700;">● ${c.status}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Priority:</span>
                            <span style="font-weight: 600;">${c.priority}</span>
                            
                            <span style="color: rgba(255,255,255,0.4);">Created:</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                `;

                const marker = L.marker([lat, lng], { icon: customIcon })
                    .bindPopup(popupContent, { className: 'custom-map-popup' })
                    .addTo(map);

                markersRef.current.push(marker);
                bounds.push([lat, lng]);
            });

            // Adjust view to envelope all markers
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else {
            // Reset to default center if there are no valid coordinates
            map.setView([20.5937, 78.9629], 5);
        }
    }, [complaints, isCitizen]);

    return (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
    );
}
