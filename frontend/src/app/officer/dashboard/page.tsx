'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { complaintsAPI, dashboardAPI, notificationsAPI } from '@/lib/api';
import { Complaint, User, DashboardStats, Notification as NotifType } from '@/lib/types';

export default function OfficerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [notifications, setNotifications] = useState<NotifType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [statusNote, setStatusNote] = useState('');
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('aquasentinel_user');
        if (stored) {
            const u = JSON.parse(stored);
            setUser(u);
            if (u.role === 'citizen') router.push('/dashboard');
        } else {
            router.push('/login');
        }
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [compRes, statsRes, notifRes] = await Promise.allSettled([
                complaintsAPI.list({ limit: 50 }),
                dashboardAPI.getStats(),
                notificationsAPI.list(),
            ]);

            if (compRes.status === 'fulfilled') setComplaints(compRes.value.data);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (complaintId: string) => {
        if (!newStatus) return;
        try {
            await complaintsAPI.updateStatus(complaintId, {
                status: newStatus,
                notes: statusNote,
            });
            setSelectedComplaint(null);
            setStatusNote('');
            setNewStatus('');
            loadData();
        } catch (e) {
            console.error('Status update failed:', e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('aquasentinel_token');
        localStorage.removeItem('aquasentinel_user');
        router.push('/');
    };

    const getSLACountdown = (deadline: string) => {
        const now = new Date();
        const end = new Date(deadline);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) return { text: 'OVERDUE', color: 'text-danger-400', urgent: true };

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) {
            return {
                text: `${days}d ${remainingHours}h remaining`,
                color: days <= 1 ? 'text-warning-400' : 'text-success-400',
                urgent: days <= 1,
            };
        }
        return {
            text: `${hours}h remaining`,
            color: hours <= 12 ? 'text-danger-400' : 'text-warning-400',
            urgent: true,
        };
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
                            <Link href="/dashboard" className="nav-link">Public Dashboard</Link>
                            <span className="text-dark-400 text-sm">
                                👤 {user?.full_name || 'Officer'} ({user?.role})
                            </span>
                            <button onClick={handleLogout} className="btn-secondary text-sm py-2">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="page-container">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold font-display mb-8">
                        🛡️ Officer Command Center
                    </h1>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Active Cases', value: stats.active_complaints, icon: '📋', color: 'text-warning-400' },
                                { label: 'Critical', value: stats.critical_complaints, icon: '🚨', color: 'text-danger-400' },
                                { label: 'Resolved', value: stats.resolved_complaints, icon: '✅', color: 'text-success-400' },
                                { label: 'Overdue', value: stats.overdue_complaints, icon: '⏰', color: 'text-danger-400' },
                            ].map((card, i) => (
                                <div key={i} className="stat-card">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{card.icon}</span>
                                        <span className="stat-label">{card.label}</span>
                                    </div>
                                    <span className={`stat-value ${card.color}`}>{card.value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Complaints Table */}
                        <div className="lg:col-span-2 glass-card p-6">
                            <h2 className="text-lg font-bold font-display text-dark-200 mb-4">
                                📋 Assigned Complaints (by severity)
                            </h2>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {complaints.map((c) => {
                                    const sla = c.sla_deadline ? getSLACountdown(c.sla_deadline) : null;
                                    return (
                                        <div
                                            key={c.id}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedComplaint?.id === c.id
                                                    ? 'bg-aqua-500/10 border-aqua-500/30'
                                                    : 'bg-dark-700/40 border-dark-600/50 hover:border-dark-500'
                                                }`}
                                            onClick={() => setSelectedComplaint(c)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <span className="font-mono text-aqua-400 text-sm">{c.complaint_number}</span>
                                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.severity_priority === 'critical' ? 'bg-danger-600/20 text-danger-400' :
                                                            c.severity_priority === 'medium' ? 'bg-warning-500/20 text-warning-400' :
                                                                'bg-success-500/20 text-success-400'
                                                        }`}>
                                                        {c.severity_priority.toUpperCase()} ({c.severity_score})
                                                    </span>
                                                </div>
                                                <span className="text-xs capitalize text-dark-400 bg-dark-600/50 px-2 py-1 rounded">
                                                    {c.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-dark-300 capitalize mb-1">
                                                {c.ai_violation_type.replace('_', ' ')} — {c.category}
                                            </p>
                                            {c.description && (
                                                <p className="text-xs text-dark-400 line-clamp-2">{c.description}</p>
                                            )}
                                            {sla && (
                                                <div className={`mt-2 text-xs font-medium ${sla.color}`}>
                                                    ⏱️ {sla.text}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {complaints.length === 0 && !loading && (
                                    <p className="text-dark-400 text-center py-8">No complaints assigned</p>
                                )}
                            </div>
                        </div>

                        {/* Sidebar: Detail + Actions */}
                        <div className="space-y-6">
                            {/* Update Status */}
                            {selectedComplaint && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="glass-card p-6"
                                >
                                    <h3 className="text-lg font-bold font-display text-dark-200 mb-4">
                                        🔄 Update Status
                                    </h3>
                                    <p className="text-sm text-dark-400 mb-4">
                                        Complaint: <span className="text-aqua-400">{selectedComplaint.complaint_number}</span>
                                    </p>

                                    <div className="space-y-3">
                                        <select
                                            className="select-field"
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                        >
                                            <option value="">Select new status</option>
                                            <option value="in_progress">🔧 In Progress</option>
                                            <option value="resolved">✅ Resolved</option>
                                            <option value="rejected">❌ Rejected</option>
                                        </select>

                                        <textarea
                                            className="input-field min-h-[80px]"
                                            placeholder="Add notes..."
                                            value={statusNote}
                                            onChange={(e) => setStatusNote(e.target.value)}
                                        />

                                        <button
                                            className="btn-primary w-full"
                                            onClick={() => handleStatusUpdate(selectedComplaint.id)}
                                            disabled={!newStatus}
                                        >
                                            Update Status
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Notifications */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold font-display text-dark-200 mb-4">
                                    🔔 Notifications
                                </h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    {notifications.length > 0 ? notifications.slice(0, 10).map((n) => (
                                        <div
                                            key={n.id}
                                            className={`p-3 rounded-lg text-sm ${n.is_read
                                                    ? 'bg-dark-700/30 text-dark-400'
                                                    : 'bg-aqua-500/5 border border-aqua-500/20 text-dark-200'
                                                }`}
                                        >
                                            {n.subject && (
                                                <p className="font-medium text-xs mb-1">{n.subject}</p>
                                            )}
                                            <p className="text-xs">{n.message}</p>
                                            <p className="text-xs text-dark-500 mt-1">
                                                {new Date(n.sent_at).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    )) : (
                                        <p className="text-dark-400 text-sm text-center py-4">No notifications</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
