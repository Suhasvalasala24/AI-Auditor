'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [metricsOpen, setMetricsOpen] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // Grab user info if you store it during login, otherwise fallback to 'User'
    useEffect(() => {
        const storedUser = localStorage.getItem('user_email');
        setUserEmail(storedUser || 'Authorized User');
    }, []);

    const handleLogout = () => {
        // Clear all auth artifacts
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_email');
        
        // Force a clean redirect to login
        router.push('/login');
        router.refresh();
    };

    const isActive = (href: string) =>
        pathname === href ? '#e5e7eb' : 'transparent';

    return (
        <aside
            style={{
                width: '240px',
                background: '#f9fafb',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                position: 'sticky',
                top: 0
            }}
        >
            {/* BRAND HEADER */}
            <div style={{ padding: '24px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#111827', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '14px' }}>AI</div>
                    <div style={{ fontWeight: 800, fontSize: '17px', color: '#111827', letterSpacing: '-0.5px' }}>Auditor</div>
                </div>
            </div>

            {/* NAVIGATION */}
            <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
                <Link href="/" style={navItem(isActive('/'))}>
                    Dashboard
                </Link>

                <div style={{ marginTop: '4px' }}>
                    <button
                        onClick={() => setMetricsOpen(!metricsOpen)}
                        style={{
                            ...navItem('transparent'),
                            width: '100%',
                            textAlign: 'left',
                            fontWeight: 700,
                            color: '#6b7280',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span>METRICS</span>
                        <span>{metricsOpen ? '▾' : '▸'}</span>
                    </button>

                    {metricsOpen && (
                        <div style={{ marginLeft: '8px', borderLeft: '1px solid #e5e7eb', marginTop: '4px' }}>
                            <Link href="/bias" style={subNavItem(isActive('/bias'))}>Bias</Link>
                            <Link href="/hallucination" style={subNavItem(isActive('/hallucination'))}>Hallucination</Link>
                            <Link href="/pii" style={subNavItem(isActive('/pii'))}>PII Data</Link>
                            <Link href="/phi" style={subNavItem(isActive('/phi'))}>Public Health (PHI)</Link>
                            <Link href="/compliance" style={subNavItem(isActive('/compliance'))}>Compliance</Link>
                            <Link href="/drift" style={subNavItem(isActive('/drift'))}>Drift</Link>
                        </div>
                    )}
                </div>

                <div style={{ height: '1px', background: '#e5e7eb', margin: '16px 4px' }} />

                <Link href="/executive-reports" style={navItem(isActive('/executive-reports'))}>Executive Reports</Link>
                <Link href="/model-manager" style={navItem(isActive('/model-manager'))}>Model Manager</Link>
                <Link href="/reports" style={navItem(isActive('/reports'))}>Audit History</Link>
                <Link href="/settings" style={navItem(isActive('/settings'))}>Settings</Link>
            </nav>

            {/* USER FOOTER & LOGOUT */}
            <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
                <div style={{ marginBottom: '12px', padding: '0 4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {userEmail}
                    </div>
                    <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>SYSTEM AUTHORIZED</div>
                </div>
                
                <button 
                    onClick={handleLogout}
                    style={logoutBtn}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

/* =========================
   STYLES
========================= */

const navItem = (bg: string) => ({
    display: 'block',
    padding: '10px 12px',
    marginBottom: '4px',
    background: bg,
    color: bg === '#e5e7eb' ? '#111827' : '#4b5563',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    border: 'none',
});

const subNavItem = (bg: string) => ({
    display: 'block',
    padding: '8px 16px',
    margin: '2px 0 2px 8px',
    background: bg,
    color: bg === '#e5e7eb' ? '#111827' : '#6b7280',
    textDecoration: 'none',
    fontSize: '12.5px',
    fontWeight: 500,
    borderRadius: '0 6px 6px 0',
    transition: 'all 0.15s ease',
});

const logoutBtn: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '6px',
    color: '#991b1b',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
};