'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { dashboardAPI, waterBodiesAPI } from '@/lib/api';
import { DashboardStats, HeatmapPoint, WaterBody, Complaint, RiskScore } from '@/lib/types';

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), { ssr: false });

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
    const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
    const [criticalAlerts, setCriticalAlerts] = useState<Complaint[]>([]);
    const [riskZones, setRiskZones] = useState<RiskScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsRes, heatmapRes, alertsRes, riskRes, wbRes] = await Promise.allSettled([
                dashboardAPI.getStats().catch(() => ({ data: null })),
                dashboardAPI.getHeatmap().catch(() => ({ data: [] })),
                dashboardAPI.getCriticalAlerts().catch(() => ({ data: [] })),
                dashboardAPI.getRiskZones().catch(() => ({ data: [] })),
                waterBodiesAPI.list().catch(() => ({ data: [] })),
            ]);

            // Use mock data if API is not available
            const mockStats: DashboardStats = {
                total_complaints: 156,
                active_complaints: 42,
                resolved_complaints: 108,
                critical_complaints: 12,
                overdue_complaints: 5,
                avg_resolution_hours: 48.5,
                resolution_rate: 69.2,
                water_bodies_at_risk: 3,
            };

            setStats(
                (statsRes.status === 'fulfilled' && statsRes.value.data) || mockStats
            );
            setHeatmap(
                (heatmapRes.status === 'fulfilled' && heatmapRes.value.data) || []
            );
            setCriticalAlerts(
                (alertsRes.status === 'fulfilled' && alertsRes.value.data) || []
            );
            setRiskZones(
                (riskRes.status === 'fulfilled' && riskRes.value.data) || []
            );
            setWaterBodies(
                (wbRes.status === 'fulfilled' && wbRes.value.data) || []
            );
        } catch (e) {
            console.error('Dashboard load error:', e);
        } finally {
            setLoading(false);
        }
    };

    const statCards = stats ? [
        { label: 'Total Complaints', value: stats.total_complaints, icon: '📋', color: 'text-primary-400' },
        { label: 'Active', value: stats.active_complaints, icon: '🔥', color: 'text-warning-400' },
        { label: 'Resolved', value: stats.resolved_complaints, icon: '✅', color: 'text-success-400' },
        { label: 'Critical', value: stats.critical_complaints, icon: '🚨', color: 'text-danger-400' },
        { label: 'Overdue', value: stats.overdue_complaints, icon: '⏰', color: 'text-danger-400' },
        { label: 'Resolution Rate', value: `${stats.resolution_rate}%`, icon: '📈', color: 'text-aqua-400' },
        { label: 'Avg Resolution (hrs)', value: stats.avg_resolution_hours?.toFixed(1) || 'N/A', icon: '⚡', color: 'text-primary-300' },
        { label: 'Water Bodies at Risk', value: stats.water_bodies_at_risk, icon: '🌊', color: 'text-warning-400' },
    ] : [];

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
                            <Link href="/track" className="nav-link">Track</Link>
                            <Link href="/login" className="btn-secondary text-sm py-2">Login</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="page-container">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold font-display">
                                🌍 Public Transparency Dashboard
                            </h1>
                            <p className="text-dark-400 mt-1">Real-time water body monitoring & complaint analytics</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {statCards.map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="stat-card"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{card.icon}</span>
                                        <span className="stat-label">{card.label}</span>
                                    </div>
                                    <span className={`stat-value ${card.color}`}>{card.value}</span>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-6 mb-8">
                        {/* Heatmap */}
                        <div className="lg:col-span-2 glass-card p-4">
                            <h2 className="text-lg font-bold font-display text-dark-200 mb-3 px-2">
                                🗺️ Complaint Heatmap
                            </h2>
                            <div className="rounded-xl overflow-hidden" style={{ height: '450px' }}>
                                <DashboardMap points={heatmap} />
                            </div>
                        </div>

                        {/* Risk Zones */}
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-bold font-display text-dark-200 mb-4">
                                ⚠️ Lake Risk Zones
                            </h2>
                            <div className="space-y-3">
                                {riskZones.length > 0 ? riskZones.map((zone, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-dark-700/40 border border-dark-600/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-dark-200 text-sm">{zone.water_body_name}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${zone.risk_level === 'high' ? 'bg-danger-600/20 text-danger-400' :
                                                    zone.risk_level === 'medium' ? 'bg-warning-500/20 text-warning-400' :
                                                        'bg-success-500/20 text-success-400'
                                                }`}>
                                                {zone.risk_level.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-dark-600 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${zone.risk_score >= 70 ? 'bg-danger-500' :
                                                        zone.risk_score >= 40 ? 'bg-warning-500' :
                                                            'bg-success-500'
                                                    }`}
                                                style={{ width: `${zone.risk_score}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-dark-400 mt-1 block">{zone.risk_score}/100</span>
                                    </div>
                                )) : (
                                    <div className="text-center text-dark-400 py-8">
                                        <p className="text-3xl mb-2">📊</p>
                                        <p className="text-sm">Risk data loading...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Critical Alerts */}
                    <div className="glass-card p-6 mb-8">
                        <h2 className="text-lg font-bold font-display text-dark-200 mb-4">
                            🚨 Critical Alerts
                        </h2>
                        {criticalAlerts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className="table-header">Complaint #</th>
                                            <th className="table-header">Violation</th>
                                            <th className="table-header">Severity</th>
                                            <th className="table-header">Status</th>
                                            <th className="table-header">SLA Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {criticalAlerts.map((alert) => (
                                            <tr key={alert.id} className="table-row">
                                                <td className="table-cell font-mono text-aqua-400">
                                                    <Link href={`/track?id=${alert.complaint_number}`} className="hover:underline">
                                                        {alert.complaint_number}
                                                    </Link>
                                                </td>
                                                <td className="table-cell capitalize">{alert.ai_violation_type.replace('_', ' ')}</td>
                                                <td className="table-cell">
                                                    <span className="badge-critical">{alert.severity_score}/100</span>
                                                </td>
                                                <td className="table-cell capitalize">{alert.status.replace('_', ' ')}</td>
                                                <td className="table-cell">
                                                    {alert.sla_deadline
                                                        ? new Date(alert.sla_deadline).toLocaleDateString('en-IN')
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-dark-400 text-center py-4">No critical alerts at this time.</p>
                        )}
                    </div>

                    {/* Water Bodies Health */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold font-display text-dark-200 mb-4">
                            🏞️ Water Bodies — Environmental Health Index
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {waterBodies.length > 0 ? waterBodies.map((wb) => (
                                <div key={wb.id} className="p-4 rounded-xl bg-dark-700/40 border border-dark-600/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium text-dark-200">{wb.name}</span>
                                        <span className={`text-xs capitalize px-2 py-1 rounded-full ${wb.type === 'lake' ? 'bg-primary-500/20 text-primary-300' :
                                                wb.type === 'river' ? 'bg-aqua-500/20 text-aqua-300' :
                                                    'bg-dark-500/40 text-dark-300'
                                            }`}>
                                            {wb.type}
                                        </span>
                                    </div>
                                    <div className="flex items-end gap-3">
                                        <span className={`text-3xl font-bold font-display ${wb.environmental_health_index >= 70 ? 'text-success-400' :
                                                wb.environmental_health_index >= 40 ? 'text-warning-400' :
                                                    'text-danger-400'
                                            }`}>
                                            {wb.environmental_health_index}
                                        </span>
                                        <span className="text-dark-400 text-xs mb-1">/100 Health Index</span>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-dark-400 col-span-full text-center py-8">Loading water bodies...</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
