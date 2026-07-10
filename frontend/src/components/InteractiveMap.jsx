import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

if (typeof window !== 'undefined') {
    window.L = L;
}

const heatPluginPromise = typeof window !== 'undefined'
    ? import('leaflet.heat').catch(() => null)
    : Promise.resolve(null);

// Custom CSS to pulse marker animations and style popups and clusters
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

  .marker-cluster-custom {
    background: none;
    border: none;
  }
  .custom-marker-cluster {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    letter-spacing: 0.02em;
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: 0 10px 32px rgba(2, 6, 23, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(12px);
    transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease, border-color 0.25s ease;
    will-change: transform;
  }
  .custom-marker-cluster:hover {
    transform: scale(1.08);
    border-color: rgba(255, 255, 255, 0.38);
    box-shadow: 0 14px 40px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.24);
  }
  .cluster-small {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.72));
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
  }
  .cluster-medium {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(37, 99, 235, 0.72));
    box-shadow: 0 0 18px rgba(59, 130, 246, 0.3);
  }
  .cluster-large {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(124, 58, 237, 0.82));
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.34);
  }

  .marker-pulse-element {
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
    will-change: transform;
  }
  .custom-leaflet-marker:hover .marker-pulse-element {
    transform: scale(1.35);
    box-shadow: 0 0 16px var(--marker-color), 0 0 8px rgba(0, 0, 0, 0.8) !important;
  }
`;

function createClusterIcon(cluster) {
    const childCount = cluster.getChildCount();
    let colorClass = 'cluster-small';
    if (childCount >= 50) {
        colorClass = 'cluster-large';
    } else if (childCount >= 10) {
        colorClass = 'cluster-medium';
    }

    return L.divIcon({
        html: `<div class="custom-marker-cluster ${colorClass}"><span>${childCount}</span></div>`,
        className: 'marker-cluster-custom',
        iconSize: L.point(40, 40, true)
    });
}

function isValidCoordinate(value) {
    const num = Number(value);
    return value !== null && value !== undefined && value !== '' && !Number.isNaN(num);
}

function getComplaintColor(complaint) {
    if (complaint.escalationLevel > 1) return '#ef4444';
    if (complaint.status === 'Resolved') return '#10b981';
    if (complaint.status === 'In Progress') return '#3b82f6';
    return '#f59e0b';
}

function getComplaintSignature(complaints) {
    return complaints.map(c => `${c._id || c.complaintId || 'unknown'}:${c.lat}:${c.lng}:${c.status || ''}:${c.priority || ''}:${c.escalationLevel || 0}`).join('|');
}

function normalizeStatus(status) {
    if (!status) return 'Pending';
    const normalized = String(status).toLowerCase();
    if (normalized.includes('resolved')) return 'Resolved';
    if (normalized.includes('progress')) return 'In Progress';
    if (normalized.includes('reject')) return 'Rejected';
    return 'Pending';
}

function normalizeCategory(category) {
    const value = String(category || 'Other').toLowerCase();
    if (value.includes('infra')) return 'Infrastructure';
    if (value.includes('service')) return 'Public Service';
    if (value.includes('corrupt')) return 'Corruption';
    if (value.includes('scam')) return 'Scam';
    if (value.includes('env')) return 'Environment';
    return 'Other';
}

function normalizePriority(priority) {
    const value = String(priority || 'Normal').toLowerCase();
    if (value.includes('critical')) return 'Critical';
    if (value.includes('high')) return 'High';
    if (value.includes('low')) return 'Low';
    return 'Medium';
}

function matchesDateFilter(createdAt, filter) {
    if (!createdAt || filter === 'All') return true;
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return false;
    const now = Date.now();
    const ranges = {
        'Last 7 Days': 7 * 24 * 60 * 60 * 1000,
        'Last 30 Days': 30 * 24 * 60 * 60 * 1000,
        'Last 90 Days': 90 * 24 * 60 * 60 * 1000,
    };
    return now - createdTime <= ranges[filter];
}

function getSearchText(complaint) {
    return [complaint.complaintId, complaint.title, complaint.location, complaint.address, complaint.city, complaint.state]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

export default function InteractiveMap({ complaints = [], isCitizen = false }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const clusterGroupRef = useRef(null);
    const heatLayerRef = useRef(null);
    const hasAutoFittedRef = useRef(false);
    const previousSignatureRef = useRef('');
    const [viewMode, setViewMode] = useState('markers');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [heatmapAvailable, setHeatmapAvailable] = useState(false);
    const [mapError, setMapError] = useState(null);

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
        let mounted = true;
        heatPluginPromise.then(() => {
            if (mounted) {
                setHeatmapAvailable(typeof L.heatLayer === 'function');
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (clusterGroupRef.current) {
                clusterGroupRef.current.clearLayers();
                if (mapRef.current && mapRef.current.hasLayer && mapRef.current.hasLayer(clusterGroupRef.current)) {
                    mapRef.current.removeLayer(clusterGroupRef.current);
                }
            }
            if (heatLayerRef.current) {
                if (mapRef.current && mapRef.current.hasLayer && mapRef.current.hasLayer(heatLayerRef.current)) {
                    mapRef.current.removeLayer(heatLayerRef.current);
                }
            }
            if (mapRef.current && mapRef.current.remove) {
                mapRef.current.remove();
            }
            if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
                mapContainerRef.current._leaflet_id = null;
            }
            clusterGroupRef.current = null;
            heatLayerRef.current = null;
            mapRef.current = null;
            previousSignatureRef.current = '';
            hasAutoFittedRef.current = false;
        };
    }, []);

    const visibleComplaints = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return complaints.filter((complaint) => {
            const lat = complaint?.lat;
            const lng = complaint?.lng;
            if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) return false;

            const status = normalizeStatus(complaint.status);
            if (statusFilter !== 'All' && status !== statusFilter) return false;

            const category = normalizeCategory(complaint.category);
            if (categoryFilter !== 'All' && category !== categoryFilter) return false;

            const priority = normalizePriority(complaint.priority);
            if (priorityFilter !== 'All' && priority !== priorityFilter) return false;

            if (!matchesDateFilter(complaint.createdAt, dateFilter)) return false;

            if (query && !getSearchText(complaint).includes(query)) return false;
            return true;
        });
    }, [complaints, categoryFilter, dateFilter, priorityFilter, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const pending = visibleComplaints.filter((complaint) => normalizeStatus(complaint.status) === 'Pending').length;
        const resolved = visibleComplaints.filter((complaint) => normalizeStatus(complaint.status) === 'Resolved').length;
        const escalated = visibleComplaints.filter((complaint) => complaint.escalationLevel > 1).length;
        const categories = new Set(visibleComplaints.map((complaint) => normalizeCategory(complaint.category)));
        return {
            visible: visibleComplaints.length,
            pending,
            resolved,
            escalated,
            categories: categories.size,
        };
    }, [visibleComplaints]);

    useEffect(() => {
        if (!mapContainerRef.current || typeof window === 'undefined' || typeof document === 'undefined') return;

        try {
            setMapError(null);

            if (complaints && complaints.length > 0) {
                console.log('[InteractiveMap] first raw complaint', complaints[0]);
            }

            if (typeof L === 'undefined' || typeof L.map !== 'function' || typeof L.tileLayer !== 'function') {
                throw new Error('Leaflet failed to initialize.');
            }

            if (typeof L.markerClusterGroup !== 'function') {
                throw new Error('Map clustering plugin is unavailable.');
            }

            const container = mapContainerRef.current;
            const existingMap = mapRef.current;

            if (existingMap && existingMap._container && existingMap._container !== container) {
                if (existingMap.remove) {
                    existingMap.remove();
                }
                mapRef.current = null;
            }

            if (container && container._leaflet_id) {
                container._leaflet_id = null;
            }

            if (!mapRef.current) {
                mapRef.current = L.map(container, {
                    zoomControl: true,
                    attributionControl: false
                }).setView([20.5937, 78.9629], 5);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    maxZoom: 20
                }).addTo(mapRef.current);
            }

            const map = mapRef.current;

            if (!clusterGroupRef.current) {
                clusterGroupRef.current = L.markerClusterGroup({
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    spiderfyOnMaxZoom: true,
                    iconCreateFunction: createClusterIcon
                });
                map.addLayer(clusterGroupRef.current);
            }

            const heatLayerFactory = typeof L.heatLayer === 'function' ? L.heatLayer : null;
            if (!heatLayerRef.current && heatLayerFactory) {
                heatLayerRef.current = heatLayerFactory([], {
                    radius: 28,
                    blur: 22,
                    maxZoom: 17,
                    gradient: {
                        0.2: '#60a5fa',
                        0.5: '#10b981',
                        1.0: '#f59e0b'
                    }
                });
                map.addLayer(heatLayerRef.current);
            }

            const clusterGroup = clusterGroupRef.current;
            const heatLayer = heatLayerRef.current;
            const shouldUseHeatmap = viewMode === 'heatmap' && heatLayer && heatmapAvailable;

            console.log('[InteractiveMap] counts', {
                totalComplaints: complaints.length,
                validCoordinateComplaints: visibleComplaints.length,
                markersConstructed: 0,
                markersAddedToCluster: 0,
            });

            if (shouldUseHeatmap) {
                if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup);
                if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
            } else {
                if (!map.hasLayer(clusterGroup)) map.addLayer(clusterGroup);
                if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
            }

            requestAnimationFrame(() => {
                if (mapRef.current === map && mapContainerRef.current && typeof map.invalidateSize === 'function') {
                    map.invalidateSize();
                }
            });
            clusterGroup.clearLayers();

            if (visibleComplaints.length === 0) {
                if (heatLayer && heatLayer._map) {
                    heatLayer.setLatLngs([]);
                }
                previousSignatureRef.current = '';
                return;
            }

            const complaintSignature = getComplaintSignature(visibleComplaints);
            if (complaintSignature === previousSignatureRef.current && hasAutoFittedRef.current) {
                return;
            }

            const bounds = [];
            const heatPoints = [];
            let markersConstructedCount = 0;
            let markersAddedCount = 0;

            visibleComplaints.forEach((complaint) => {
                const lat = Number(complaint.lat);
                const lng = Number(complaint.lng);
                const color = getComplaintColor(complaint);

                const coordinateCandidates = {
                    direct: { lat: complaint?.lat, lng: complaint?.lng },
                    latitudeLongitude: { lat: complaint?.latitude, lng: complaint?.longitude },
                    locationDirect: { lat: complaint?.location?.lat, lng: complaint?.location?.lng },
                    locationCoordinates: { lat: complaint?.location?.coordinates?.[1], lng: complaint?.location?.coordinates?.[0] },
                };
                console.log('[InteractiveMap] coordinate candidate shapes', coordinateCandidates);

                const markerHtml = `
                    <div class="marker-pulse-element" style="
                        background-color: ${color};
                        --marker-color: ${color};
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

                const dateStr = new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                const popupContent = isCitizen ? `
                    <div style="font-family: 'DM Sans', sans-serif; color: #f8fafc; line-height: 1.5; font-size: 12px; width: 220px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">${complaint.title}</h4>
                        <div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">
                            <span style="color: rgba(255,255,255,0.4);">Tracking ID:</span>
                            <span style="font-family: monospace; font-weight: 600; color: #3b82f6;">${complaint.complaintId || '—'}</span>
                            <span style="color: rgba(255,255,255,0.4);">Category:</span>
                            <span>${complaint.category}</span>
                            <span style="color: rgba(255,255,255,0.4);">Status:</span>
                            <span style="color: ${color}; font-weight: 700;">● ${complaint.status}</span>
                            <span style="color: rgba(255,255,255,0.4);">Priority:</span>
                            <span style="font-weight: 600;">${complaint.priority}</span>
                            <span style="color: rgba(255,255,255,0.4);">Created:</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                ` : `
                    <div style="font-family: 'DM Sans', sans-serif; color: #f8fafc; line-height: 1.5; font-size: 12px; width: 220px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">${complaint.title}</h4>
                        <div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">
                            <span style="color: rgba(255,255,255,0.4);">ID:</span>
                            <span style="font-family: monospace; font-weight: 600; color: #3b82f6;">${complaint.complaintId || '—'}</span>
                            <span style="color: rgba(255,255,255,0.4);">Citizen:</span>
                            <span>${complaint.user?.name || complaint.citizenName || 'Citizen'}</span>
                            <span style="color: rgba(255,255,255,0.4);">Category:</span>
                            <span>${complaint.category}</span>
                            <span style="color: rgba(255,255,255,0.4);">Status:</span>
                            <span style="color: ${color}; font-weight: 700;">● ${complaint.status}</span>
                            <span style="color: rgba(255,255,255,0.4);">Priority:</span>
                            <span style="font-weight: 600;">${complaint.priority}</span>
                            <span style="color: rgba(255,255,255,0.4);">Created:</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                `;

                const marker = L.marker([lat, lng], { icon: customIcon })
                    .bindPopup(popupContent, { className: 'custom-map-popup' });

                markersConstructedCount += 1;
                clusterGroup.addLayer(marker);
                markersAddedCount += 1;
                bounds.push([lat, lng]);
                heatPoints.push([lat, lng, 0.85]);
            });

            console.log('[InteractiveMap] markers pipeline', {
                markersConstructed: markersConstructedCount,
                markersAddedToCluster: markersAddedCount,
                hasBounds: bounds.length > 0,
                clusterLayerCount: clusterGroup.getLayers ? clusterGroup.getLayers().length : 'n/a',
            });

            if (heatLayer && heatLayer._map && typeof heatLayer.setLatLngs === 'function') {
                heatLayer.setLatLngs(heatPoints);
            }
            previousSignatureRef.current = complaintSignature;

            if (bounds.length > 0 && !hasAutoFittedRef.current && mapRef.current === map && typeof map.fitBounds === 'function') {
                map.fitBounds(bounds, { padding: [50, 50] });
                hasAutoFittedRef.current = true;
            }
        } catch (error) {
            console.error('InteractiveMap initialization failed:', error);
            setMapError(error.message || 'The map could not be loaded.');
        }
    }, [complaints, heatmapAvailable, isCitizen, viewMode, visibleComplaints]);

    if (mapError) {
        return (
            <div style={{ width: '100%', height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.72)', padding: '16px' }}>
                <div style={{ textAlign: 'center', maxWidth: '320px' }}>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>Map temporarily unavailable</p>
                    <p style={{ color: 'rgba(255,255,255,0.66)', fontSize: '12px', marginTop: '6px' }}>{mapError}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setViewMode('markers')}
                        style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '999px',
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: viewMode === 'markers' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                            background: viewMode === 'markers' ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'rgba(255,255,255,0.04)',
                            cursor: 'pointer'
                        }}
                    >
                        Marker View
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('heatmap')}
                        style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '999px',
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: viewMode === 'heatmap' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                            background: viewMode === 'heatmap' ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'rgba(255,255,255,0.04)',
                            cursor: 'pointer'
                        }}
                    >
                        Heatmap View
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by ID, title, or location"
                        style={{ flex: '1 1 220px', minWidth: '220px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ffffff', padding: '9px 12px', fontSize: '12px', outline: 'none' }}
                    />
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ffffff', padding: '9px 12px', fontSize: '12px', outline: 'none' }}>
                        <option value="All" style={{ color: '#0f172a' }}>All</option>
                        <option value="Pending" style={{ color: '#0f172a' }}>Pending</option>
                        <option value="In Progress" style={{ color: '#0f172a' }}>In Progress</option>
                        <option value="Resolved" style={{ color: '#0f172a' }}>Resolved</option>
                        <option value="Escalated" style={{ color: '#0f172a' }}>Escalated</option>
                    </select>
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ffffff', padding: '9px 12px', fontSize: '12px', outline: 'none' }}>
                        <option value="All" style={{ color: '#0f172a' }}>All</option>
                        <option value="Infrastructure" style={{ color: '#0f172a' }}>Infrastructure</option>
                        <option value="Public Service" style={{ color: '#0f172a' }}>Public Service</option>
                        <option value="Corruption" style={{ color: '#0f172a' }}>Corruption</option>
                        <option value="Scam" style={{ color: '#0f172a' }}>Scam</option>
                        <option value="Environment" style={{ color: '#0f172a' }}>Environment</option>
                        <option value="Other" style={{ color: '#0f172a' }}>Other</option>
                    </select>
                    <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={{ borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ffffff', padding: '9px 12px', fontSize: '12px', outline: 'none' }}>
                        <option value="All" style={{ color: '#0f172a' }}>All</option>
                        <option value="Low" style={{ color: '#0f172a' }}>Low</option>
                        <option value="Medium" style={{ color: '#0f172a' }}>Medium</option>
                        <option value="High" style={{ color: '#0f172a' }}>High</option>
                        <option value="Critical" style={{ color: '#0f172a' }}>Critical</option>
                    </select>
                    <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} style={{ borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ffffff', padding: '9px 12px', fontSize: '12px', outline: 'none' }}>
                        <option value="All" style={{ color: '#0f172a' }}>All Time</option>
                        <option value="Last 7 Days" style={{ color: '#0f172a' }}>Last 7 Days</option>
                        <option value="Last 30 Days" style={{ color: '#0f172a' }}>Last 30 Days</option>
                        <option value="Last 90 Days" style={{ color: '#0f172a' }}>Last 90 Days</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                <div style={{ borderRadius: '12px', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Visible Complaints</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{stats.visible}</div>
                </div>
                <div style={{ borderRadius: '12px', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Pending</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{stats.pending}</div>
                </div>
                <div style={{ borderRadius: '12px', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Resolved</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{stats.resolved}</div>
                </div>
                <div style={{ borderRadius: '12px', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Categories Represented</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{stats.categories}</div>
                </div>
            </div>

            <div ref={mapContainerRef} style={{ width: '100%', flex: 1, minHeight: '300px', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
    );
}
