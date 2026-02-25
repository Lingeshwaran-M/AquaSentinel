'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await authAPI.login({ email, password });
            localStorage.setItem('aquasentinel_token', res.data.access_token);
            localStorage.setItem('aquasentinel_user', JSON.stringify(res.data.user));

            // Redirect based on role
            const role = res.data.user.role;
            if (role === 'officer' || role === 'supervisor' || role === 'admin') {
                router.push('/officer/dashboard');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4">
            <div className="absolute top-20 left-10 w-72 h-72 bg-aqua-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-card p-8 w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-4">
                        <span className="text-4xl">🌊</span>
                        <span className="text-2xl font-bold font-display gradient-text">AquaSentinel X</span>
                    </Link>
                    <h1 className="text-2xl font-bold font-display text-dark-100">Welcome Back</h1>
                    <p className="text-dark-400 mt-1">Sign in to your account</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-danger-600/10 border border-danger-500/30 text-danger-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="label-text">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="input-field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="label-text">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-dark-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-aqua-400 hover:text-aqua-300 font-medium">
                        Sign up
                    </Link>
                </div>

                {/* Demo credentials */}
                <div className="mt-6 p-4 rounded-xl bg-dark-700/50 border border-dark-600/50">
                    <p className="text-xs text-dark-400 font-medium mb-2">Demo Credentials:</p>
                    <p className="text-xs text-dark-300">Citizen: citizen@aquasentinel.com</p>
                    <p className="text-xs text-dark-300">Officer: officer1@aquasentinel.com</p>
                    <p className="text-xs text-dark-300">Password: admin123</p>
                </div>
            </motion.div>
        </div>
    );
}
