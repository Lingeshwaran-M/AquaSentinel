'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authAPI } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await authAPI.register({
                email,
                password,
                full_name: fullName,
                phone: phone || undefined,
            });
            localStorage.setItem('aquasentinel_token', res.data.access_token);
            localStorage.setItem('aquasentinel_user', JSON.stringify(res.data.user));
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4 py-12">
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
                    <h1 className="text-2xl font-bold font-display text-dark-100">Create Account</h1>
                    <p className="text-dark-400 mt-1">Join the water protection movement</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-danger-600/10 border border-danger-500/30 text-danger-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="label-text">Full Name</label>
                        <input
                            id="fullName"
                            type="text"
                            className="input-field"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="regEmail" className="label-text">Email Address</label>
                        <input
                            id="regEmail"
                            type="email"
                            className="input-field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="label-text">Phone Number (optional)</label>
                        <input
                            id="phone"
                            type="tel"
                            className="input-field"
                            placeholder="+91-9876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="regPassword" className="label-text">Password</label>
                        <input
                            id="regPassword"
                            type="password"
                            className="input-field"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="label-text">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="input-field"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-dark-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-aqua-400 hover:text-aqua-300 font-medium">
                        Sign in
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
