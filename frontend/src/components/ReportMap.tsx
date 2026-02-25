'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ── Icons ─────────────────────────────────────────────────── */
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Animated pulsing cyan dot — shown when GPS auto-detected
const gpsIcon = L.divIcon({
    html: `
        <div style="position:relative;width:24px;height:24px;">
            <div style="
                width:24px;height:24px;
                background:#22d3ee;
                border:3px solid white;
                border-radius:50%;
                box-shadow:0 0 0 0 rgba(34,211,238,0.6);
                animation:gps-pulse 1.8s ease-out infinite;
            "></div>
        </div>
        <style>
            @keyframes gps-pulse {
                0%   { box-shadow: 0 0 0 0   rgba(34,211,238,0.6); }
                70%  { box-shadow: 0 0 0 14px rgba(34,211,238,0);   }
                100% { box-shadow: 0 0 0 0   rgba(34,211,238,0);    }
            }
        </style>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

L.Marker.prototype.options.icon = defaultIcon;

/* ── Types ──────────────────────────────────────────────────── */
interface ReportMapProps {
    onMapClick: (lat: number, lng: number) => void;
    selectedLat: number | null;
    selectedLng: number | null;
    isGPS: boolean;          // true = GPS auto location, false = manual click
}

/* ── Map click handler ──────────────────────────────────────── */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/* ── Auto fly-to whenever lat/lng changes ───────────────────── */
function AutoFlyTo({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], 16, { animate: true, duration: 1.8 });
    }, [lat, lng]); // re-fly every time position updates
    return null;
}

/* ── Main component ─────────────────────────────────────────── */
export default function ReportMap({ onMapClick, selectedLat, selectedLng, isGPS }: ReportMapProps) {
    const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore fallback

    return (
        <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={onMapClick} />

            {selectedLat && selectedLng && (
                <>
                    {/* Fly to the location every time it changes */}
                    <AutoFlyTo lat={selectedLat} lng={selectedLng} />

                    {/* GPS = pulsing cyan dot, Manual = standard red pin */}
                    <Marker
                        position={[selectedLat, selectedLng]}
                        icon={isGPS ? gpsIcon : defaultIcon}
                    />
                </>
            )}
        </MapContainer>
    );
}
