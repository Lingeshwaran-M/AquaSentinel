'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HomePage() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const features = [
        {
            icon: '📍',
            title: 'GPS-Enabled Reporting',
            desc: 'Click on the map to report encroachments with precise GPS coordinates and auto-validate against water body boundaries.',
        },
        {
            icon: '🤖',
            title: 'AI Classification',
            desc: 'Advanced AI analyzes uploaded images to detect construction, debris, land filling, and pollution violations automatically.',
        },
        {
            icon: '📊',
            title: 'Severity Scoring',
            desc: 'Environmental Severity Index (ESI) calculates priority scores based on violation type, location, and historical data.',
        },
        {
            icon: '⏱️',
            title: 'SLA Enforcement',
            desc: 'Automated tracking with time-bound deadlines. Complaints auto-escalate if authorities miss their deadlines.',
        },
        {
            icon: '🔮',
            title: 'Risk Prediction',
            desc: 'Lake-level risk analytics predict which water bodies are most threatened based on trends and complaint patterns.',
        },
        {
            icon: '🗺️',
            title: 'Public Transparency',
            desc: 'Real-time heatmaps, resolution statistics, and environmental health indexes available to the public.',
        },
    ];

    const stats = [
        { value: '500+', label: 'Water Bodies Monitored' },
        { value: '10K+', label: 'Complaints Processed' },
        { value: '92%', label: 'Resolution Rate' },
        { value: '< 48h', label: 'Avg Critical Response' },
    ];

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 bg-hero-pattern z-0">
                <div className="absolute top-20 left-10 w-72 h-72 bg-aqua-500/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-aqua-400/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 border-b border-dark-700/50 backdrop-blur-xl bg-dark-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🌊</span>
                            <span className="text-xl font-bold font-display gradient-text">AquaSentinel X</span>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="/dashboard" className="nav-link">Dashboard</Link>
                            <Link href="/report" className="nav-link">Report</Link>
                            <Link href="/track" className="nav-link">Track</Link>
                            <Link href="/login" className="btn-secondary text-sm py-2">Login</Link>
                            <Link href="/register" className="btn-primary text-sm py-2">Sign Up</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10">
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-aqua-500/10 border border-aqua-500/20 text-aqua-400 text-sm font-medium mb-8">
                            <span className="w-2 h-2 rounded-full bg-aqua-400 animate-pulse" />
                            AI-Powered Environmental Protection
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold font-display mb-6 leading-tight">
                            Protect Our{' '}
                            <span className="gradient-text">Water Bodies</span>
                            <br />
                            From Encroachment
                        </h1>

                        <p className="text-xl text-dark-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Report illegal encroachments with a single click. Our AI classifies violations,
                            scores severity, and ensures authorities take time-bound action.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/report" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
                                <span>📢</span> Report Encroachment
                            </Link>
                            <Link href="/dashboard" className="btn-secondary text-lg px-8 py-4 inline-flex items-center gap-2">
                                <span>📊</span> View Dashboard
                            </Link>
                        </div>
                    </motion.div>

                    {/* Stats Row */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto"
                    >
                        {stats.map((stat, i) => (
                            <div key={i} className="glass-card p-6 text-center">
                                <div className="stat-value gradient-text">{stat.value}</div>
                                <div className="stat-label mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </section>

                {/* Features Grid */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={isLoaded ? { opacity: 1 } : {}}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-4">
                            Powered by <span className="gradient-text">Advanced AI</span>
                        </h2>
                        <p className="text-dark-400 text-center mb-12 max-w-2xl mx-auto">
                            From image classification to risk prediction, every step is automated
                            for maximum efficiency and transparency.
                        </p>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                                    className="glass-card-hover p-8 group"
                                >
                                    <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform duration-300">
                                        {feature.icon}
                                    </span>
                                    <h3 className="text-lg font-bold font-display text-dark-100 mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-dark-400 text-sm leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* CTA Section */}
                <section className="border-t border-dark-700/50 bg-dark-900/50 backdrop-blur-xl">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                        <h2 className="text-3xl font-bold font-display mb-4">
                            Every Report <span className="gradient-text">Matters</span>
                        </h2>
                        <p className="text-dark-400 mb-8 max-w-xl mx-auto">
                            Join thousands of citizens protecting our water bodies.
                            Your report triggers an automated enforcement pipeline that holds authorities accountable.
                        </p>
                        <Link href="/register" className="btn-primary text-lg px-10 py-4 inline-block">
                            Get Started — It&apos;s Free
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-dark-700/50 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🌊</span>
                            <span className="font-display font-bold gradient-text">AquaSentinel X</span>
                        </div>
                        <p className="text-dark-500 text-sm">
                            © 2026 AquaSentinel X. Protecting Water Bodies with AI.
                        </p>
                        <div className="flex gap-4">
                            <Link href="/dashboard" className="text-dark-400 hover:text-aqua-400 text-sm transition-colors">Dashboard</Link>
                            <Link href="/report" className="text-dark-400 hover:text-aqua-400 text-sm transition-colors">Report</Link>
                            <Link href="/track" className="text-dark-400 hover:text-aqua-400 text-sm transition-colors">Track</Link>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
