'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { complaintsAPI } from '@/lib/api';

// Dynamic import for Leaflet (SSR-safe)
const MapComponent = dynamic(() => import('@/components/ReportMap'), { ssr: false });

/* ── GPS status types ───────────────────────────────────────── */
type GpsStatus = 'idle' | 'requesting' | 'success' | 'denied' | 'unavailable' | 'timeout';

export default function ReportPage() {
    /* form state */
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [isGPS, setIsGPS] = useState(false);
    const [category, setCategory] = useState('lake');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState('');

    /* GPS and Permission status */
    const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);

    const watchIdRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup GPS on unmount
    useEffect(() => {
        return () => stopGPSWatch();
    }, []);

    function startGPSWatch() {
        if (!navigator.geolocation) {
            setGpsStatus('unavailable');
            return;
        }

        setGpsStatus('requesting');
        setShowPermissionPrompt(false);

        // watchPosition keeps updating when user moves
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setLatitude(pos.coords.latitude);
                setLongitude(pos.coords.longitude);
                setAccuracy(Math.round(pos.coords.accuracy));
                setIsGPS(true);
                setGpsStatus('success');
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setGpsStatus('denied');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setGpsStatus('unavailable');
                        break;
                    case err.TIMEOUT:
                        setGpsStatus('timeout');
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000,
            }
        );
    }

    function stopGPSWatch() {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }

    function retryGPS() {
        stopGPSWatch();
        setLatitude(null);
        setLongitude(null);
        setIsGPS(false);
        setAccuracy(null);
        startGPSWatch();
    }

    /* ── Manual map click overrides GPS ──────────────────────── */
    const handleMapClick = (lat: number, lng: number) => {
        setLatitude(lat);
        setLongitude(lng);
        setIsGPS(false);
        setAccuracy(null);
        // If they click map, we hide the prompt anyway
        setShowPermissionPrompt(false);
    };

    /* ── Image upload ─────────────────────────────────────────── */
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    /* ── Submit ───────────────────────────────────────────────── */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!latitude || !longitude) {
            setError('Please allow location access or click on the map to select a location.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('category', category);
            formData.append('latitude', latitude.toString());
            formData.append('longitude', longitude.toString());
            formData.append('description', description);
            if (address) formData.append('address', address);
            if (image) formData.append('image', image);
            const res = await complaintsAPI.submit(formData);
            setSuccess(res.data.complaint_number);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit complaint. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ── GPS status helpers ───────────────────────────────────── */
    const gpsLabel: Record<GpsStatus, { icon: string; text: string; color: string }> = {
        idle: { icon: '⏳', text: 'Waiting for GPS…', color: 'text-dark-400' },
        requesting: { icon: '📡', text: 'Detecting your location…', color: 'text-yellow-400' },
        success: { icon: '🎯', text: `GPS locked${accuracy ? ` (±${accuracy}m)` : ''}`, color: 'text-aqua-400' },
        denied: { icon: '🚫', text: 'Location permission denied', color: 'text-red-400' },
        unavailable: { icon: '📵', text: 'Location unavailable', color: 'text-red-400' },
        timeout: { icon: '⏱️', text: 'GPS timed out — click map', color: 'text-yellow-400' },
    };
    const gps = gpsLabel[gpsStatus];

    /* ── Success screen ───────────────────────────────────────── */
    if (success) {
        return (
            <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-10 max-w-lg text-center"
                >
                    <div className="text-6xl mb-6">✅</div>
                    <h1 className="text-3xl font-bold font-display mb-4">Complaint Submitted!</h1>
                    <p className="text-dark-400 mb-6">
                        Your complaint has been registered and is being processed by our AI engine.
                    </p>
                    <div className="p-4 rounded-xl bg-aqua-500/10 border border-aqua-500/30 mb-6">
                        <p className="text-sm text-dark-400">Your Complaint ID</p>
                        <p className="text-2xl font-bold font-display gradient-text mt-1">{success}</p>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <Link href={`/track?id=${success}`} className="btn-primary">Track Status</Link>
                        <Link href="/dashboard" className="btn-secondary">Go to Dashboard</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Navbar */}
            <nav className="border-b border-dark-700/50 backdrop-blur-xl bg-dark-900/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🌊</span>
                            <span className="font-bold font-display gradient-text">AquaSentinel X</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="nav-link">Dashboard</Link>
                            <Link href="/track" className="nav-link">Track</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="page-container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl">📢</span>
                        <div>
                            <h1 className="text-3xl font-bold font-display">Report Encroachment</h1>
                            <p className={`mt-1 text-sm font-medium flex items-center gap-1 ${gps.color}`}>
                                <span>{gps.icon}</span>
                                <span>{gpsStatus === 'success' && accuracy
                                    ? `GPS locked (±${accuracy}m accuracy)`
                                    : gps.text}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 relative">
                        {/* Map Panel with Permission Prompt */}
                        <div className="glass-card p-4 overflow-hidden relative" style={{ minHeight: '520px' }}>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h2 className="text-lg font-bold font-display text-dark-200">📍 Location</h2>
                            </div>

                            <div className="rounded-xl overflow-hidden relative" style={{ height: '430px' }}>
                                <MapComponent
                                    onMapClick={handleMapClick}
                                    selectedLat={latitude}
                                    selectedLng={longitude}
                                    isGPS={isGPS}
                                />

                                {/* Permission Prompt Overlay */}
                                <AnimatePresence>
                                    {showPermissionPrompt && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 z-[1000] flex items-center justify-center bg-dark-950/60 backdrop-blur-sm p-6"
                                        >
                                            <motion.div
                                                initial={{ scale: 0.9, y: 20 }}
                                                animate={{ scale: 1, y: 0 }}
                                                className="glass-card p-8 max-w-sm text-center border-aqua-500/30"
                                            >
                                                <div className="text-4xl mb-4">🛰️</div>
                                                <h3 className="text-xl font-bold font-display mb-2">Enable Live Location?</h3>
                                                <p className="text-dark-400 text-sm mb-6 leading-relaxed">
                                                    We need your permission to automatically track the encroachment location in real-time.
                                                </p>
                                                {gpsStatus === 'denied' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mb-5 p-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-xl">🚫</span>
                                                            <div>
                                                                <p className="font-bold text-red-400 mb-2">Location Access Blocked!</p>
                                                                <p className="mb-3 opacity-90">Your browser has blocked location access. To fix this:</p>
                                                                <ul className="list-disc ml-4 space-y-1 opacity-80">
                                                                    <li>Click the <b>Lock (🔒)</b> icon in the browser address bar.</li>
                                                                    <li>Change the <b>Location</b> setting to <b>"Allow"</b>.</li>
                                                                    <li><b>Refresh</b> the page and try again.</li>
                                                                </ul>
                                                                <button
                                                                    onClick={retryGPS}
                                                                    className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 transition-all text-xs font-bold"
                                                                >
                                                                    🔄 Try Again After Allowing
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {(gpsStatus === 'timeout' || gpsStatus === 'unavailable') && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mb-5 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30
                                                                   text-yellow-300 text-sm flex items-center justify-between gap-4"
                                                    >
                                                        <span>
                                                            ⚠️ GPS signal not found. Please click on the map to set your location manually.
                                                        </span>
                                                        <button
                                                            onClick={retryGPS}
                                                            className="shrink-0 px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30
                                                                       text-yellow-300 text-xs font-medium border border-yellow-500/30 transition-colors"
                                                        >
                                                            🔄 Retry GPS
                                                        </button>
                                                    </motion.div>
                                                )}
                                                <div className="space-y-3">
                                                    <button
                                                        onClick={() => startGPSWatch()}
                                                        className="btn-primary w-full py-3 text-sm"
                                                    >
                                                        🎯 Grant Live GPS Access
                                                    </button>
                                                    <button
                                                        onClick={() => setShowPermissionPrompt(false)}
                                                        className="btn-secondary w-full py-3 text-sm"
                                                    >
                                                        📍 Set Map Manually
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Info bar */}
                            <div className="mt-3 px-1 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                    {latitude && longitude ? (
                                        <>
                                            <span className={`font-semibold ${isGPS ? 'text-aqua-400' : 'text-purple-400'}`}>
                                                {isGPS ? '🎯 GPS' : '🖱️ Manual'}
                                            </span>
                                            <span className="text-dark-400 font-mono">
                                                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-dark-500 italic">No location selected yet</span>
                                    )}
                                </div>

                                {gpsStatus !== 'idle' && !showPermissionPrompt && (
                                    <button
                                        onClick={retryGPS}
                                        className="text-aqua-400 hover:text-aqua-300 flex items-center gap-1 transition-colors"
                                    >
                                        🔄 Refresh GPS
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Form Panel */}
                        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
                            <h2 className="text-lg font-bold font-display text-dark-200">📝 Complaint Details</h2>

                            <div>
                                <label className="label-text">Water Body Type</label>
                                <select
                                    className="select-field"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="lake">🏞️ Lake</option>
                                    <option value="river">🌊 River</option>
                                    <option value="canal">🚿 Canal</option>
                                </select>
                            </div>

                            <div>
                                <label className="label-text">Description</label>
                                <textarea
                                    className="input-field min-h-[120px]"
                                    placeholder="Describe the encroachment…"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="label-text">Address / Landmark (optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Nearby landmark"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label-text">Upload Image / Video</label>
                                <div
                                    className="border-2 border-dashed border-dark-600 rounded-xl p-5 text-center
                                               cursor-pointer hover:border-aqua-500/50 transition-colors group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {imagePreview ? (
                                        <div>
                                            <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-cover" />
                                            <p className="text-xs text-dark-400 mt-2">{image?.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📷</div>
                                            <p className="text-dark-400 text-sm">Upload evidence</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                    ⚠️ {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn-primary w-full py-4 text-lg"
                                disabled={loading || !latitude || !longitude}
                            >
                                {loading ? 'Processing...' : '🚀 Submit Complaint'}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
