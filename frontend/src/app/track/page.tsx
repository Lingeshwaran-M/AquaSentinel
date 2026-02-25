'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { complaintsAPI } from '@/lib/api';
import { Complaint } from '@/lib/types';

const statusColors: Record<string, string> = {
    submitted: 'badge-low',
    validated: 'badge-low',
    ai_processed: 'badge-medium',
    assigned: 'badge-medium',
    in_progress: 'badge-medium',
    resolved: 'badge-low',
    rejected: 'badge-critical',
    escalated: 'badge-critical',
};

const statusLabels: Record<string, string> = {
    submitted: '📝 Submitted',
    validated: '✅ Validated',
    ai_processed: '🤖 AI Processed',
    assigned: '👤 Assigned',
    in_progress: '🔧 In Progress',
    resolved: '✅ Resolved',
    rejected: '❌ Rejected',
    escalated: '⚠️ Escalated',
};

export default function TrackPage() {
    const searchParams = useSearchParams();
    const [complaintNumber, setComplaintNumber] = useState(searchParams.get('id') || '');
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async (e: FormEvent) => {
        e.preventDefault();
        if (!complaintNumber.trim()) return;

        setLoading(true);
        setError('');
        setComplaint(null);

        try {
            const res = await complaintsAPI.track(complaintNumber.trim());
            setComplaint(res.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Complaint not found. Please check the complaint number.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950">
            <nav className="border-b border-dark-700/50 backdrop-blur-xl bg-dark-900/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🌊</span>
                            <span className="font-bold font-display gradient-text">AquaSentinel X</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/report" className="nav-link">Report</Link>
                            <Link href="/dashboard" className="nav-link">Dashboard</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="page-container max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-10">
                        <span className="text-5xl mb-4 block">🔍</span>
                        <h1 className="text-3xl font-bold font-display mb-2">Track Your Complaint</h1>
                        <p className="text-dark-400">Enter your complaint number to view real-time status</p>
                    </div>

                    <form onSubmit={handleTrack} className="glass-card p-6 flex gap-4 mb-8">
                        <input
                            type="text"
                            className="input-field flex-1"
                            placeholder="e.g., AQS-20260225-00001"
                            value={complaintNumber}
                            onChange={(e) => setComplaintNumber(e.target.value)}
                        />
                        <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
                            {loading ? 'Searching...' : 'Track'}
                        </button>
                    </form>

                    {error && (
                        <div className="p-4 rounded-xl bg-danger-600/10 border border-danger-500/30 text-danger-400 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {complaint && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Status Card */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold font-display">{complaint.complaint_number}</h2>
                                    <span className={statusColors[complaint.status] || 'badge-low'}>
                                        {statusLabels[complaint.status] || complaint.status}
                                    </span>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-dark-400">Violation Type</p>
                                        <p className="text-dark-200 font-medium capitalize">
                                            {complaint.ai_violation_type.replace('_', ' ')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-dark-400">AI Confidence</p>
                                        <p className="text-dark-200 font-medium">
                                            {(complaint.ai_confidence_score * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-dark-400">Severity Score</p>
                                        <p className="text-dark-200 font-medium">
                                            {complaint.severity_score}/100
                                            <span className={`ml-2 ${complaint.severity_priority === 'critical' ? 'text-danger-400' :
                                                    complaint.severity_priority === 'medium' ? 'text-warning-400' :
                                                        'text-success-400'
                                                }`}>
                                                ({complaint.severity_priority.toUpperCase()})
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-dark-400">SLA Deadline</p>
                                        <p className="text-dark-200 font-medium">
                                            {complaint.sla_deadline
                                                ? new Date(complaint.sla_deadline).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })
                                                : 'Not set'}
                                        </p>
                                    </div>
                                </div>

                                {complaint.description && (
                                    <div className="mt-4 pt-4 border-t border-dark-700/50">
                                        <p className="text-xs text-dark-400 mb-1">Description</p>
                                        <p className="text-dark-300 text-sm">{complaint.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Status Timeline */}
                            {complaint.status_log && complaint.status_log.length > 0 && (
                                <div className="glass-card p-6">
                                    <h3 className="text-lg font-bold font-display mb-4">📋 Status Timeline</h3>
                                    <div className="space-y-4">
                                        {complaint.status_log.map((log, i) => (
                                            <div key={log.id} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-aqua-400' : 'bg-dark-600'
                                                        }`} />
                                                    {i < complaint.status_log!.length - 1 && (
                                                        <div className="w-0.5 h-full bg-dark-700 mt-1" />
                                                    )}
                                                </div>
                                                <div className="pb-4">
                                                    <p className="text-dark-200 font-medium text-sm capitalize">
                                                        {log.new_status.replace('_', ' ')}
                                                    </p>
                                                    {log.notes && (
                                                        <p className="text-dark-400 text-xs mt-1">{log.notes}</p>
                                                    )}
                                                    <p className="text-dark-500 text-xs mt-1">
                                                        {new Date(log.changed_at).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold font-display mb-2">📍 Location</h3>
                                <p className="text-dark-400 text-sm">
                                    Latitude: {complaint.latitude}, Longitude: {complaint.longitude}
                                </p>
                                {complaint.address && (
                                    <p className="text-dark-300 text-sm mt-1">{complaint.address}</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
