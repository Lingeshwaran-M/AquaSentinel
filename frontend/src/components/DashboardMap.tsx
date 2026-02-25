'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HeatmapPoint } from '@/lib/types';

interface DashboardMapProps {
    points: HeatmapPoint[];
}

export default function DashboardMap({ points }: DashboardMapProps) {
    const center: [number, number] = [12.9716, 77.5946];

    const getColor = (weight: number) => {
        if (weight >= 0.7) return '#ef4444';
        if (weight >= 0.4) return '#f59e0b';
        return '#22c55e';
    };

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((point, i) => (
                <CircleMarker
                    key={i}
                    center={[point.latitude, point.longitude]}
                    radius={8 + point.weight * 12}
                    pathOptions={{
                        color: getColor(point.weight),
                        fillColor: getColor(point.weight),
                        fillOpacity: 0.6,
                        weight: 2,
                    }}
                >
                    <Popup>
                        <div style={{ color: '#1e293b', fontSize: '13px' }}>
                            <strong>Severity: {Math.round(point.weight * 100)}%</strong>
                            <br />
                            Priority: {point.severity || 'N/A'}
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </MapContainer>
    );
}
