import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AquaSentinel X — Water Body Protection Platform',
    description: 'AI-Driven Water Body Encroachment Monitoring & Enforcement Platform. Report illegal encroachments, track complaint status, and view real-time analytics.',
    keywords: ['water body', 'encroachment', 'monitoring', 'AI', 'environment', 'complaints'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen">
                {children}
            </body>
        </html>
    );
}
