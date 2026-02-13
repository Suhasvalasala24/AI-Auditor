'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // ✅ Use URLSearchParams for OAuth2 Password Flow compatibility
        const formData = new URLSearchParams();
        formData.append('username', email); // FastAPI standard uses 'username' field for email
        formData.append('password', password);

        try {
            const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Authentication failed');
            }

            const data = await res.json();

            // ✅ Store the actual JWT for the api-client.ts to use
            localStorage.setItem('auth_token', data.access_token);
            
            // Redirect to the core workspace
            router.push('/model-manager');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Connection error. Is the backend running?');
            setIsLoading(false);
        }
    };

    return (
        <div style={pageContainer}>
            <div style={loginCard}>
                {/* Brand Header */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={logoBadge}>AI</div>
                    <h1 style={titleStyle}>Auditor</h1>
                    <p style={subtitleStyle}>Enterprise Governance Portal</p>
                </div>

                {/* Error Callout */}
                {error && <div style={errorBanner}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={inputGroup}>
                        <label style={labelStyle}>Corporate Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@enterprise.com"
                            style={inputStyle}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div style={inputGroup}>
                        <label style={labelStyle}>Secure Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={inputStyle}
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={toggleBtn}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            ...submitBtn,
                            opacity: isLoading ? 0.7 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Verifying Identity...' : 'Sign In to Portal'}
                    </button>
                </form>

                <div style={footerStyle}>
                    Authorized access only. All interactions are logged for audit purposes.
                </div>
            </div>
        </div>
    );
}

/* =========================
   ENTERPRISE STYLING
========================= */

const pageContainer: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#F9FAFB', // Professional neutral background
    padding: '24px',
};

const loginCard: React.CSSProperties = {
    background: '#FFFFFF',
    width: '100%',
    maxWidth: '440px',
    padding: '48px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
};

const logoBadge: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    background: '#111827',
    color: '#FFF',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 900,
    marginBottom: '16px',
};

const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 800,
    color: '#111827',
    margin: 0,
    letterSpacing: '-0.5px',
};

const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0',
};

const inputGroup: React.CSSProperties = {
    marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: '#4B5563',
    marginBottom: '8px',
    letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    background: '#FFFFFF',
    border: '2px solid #F3F4F6', // Subdued borders
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const toggleBtn: React.CSSProperties = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '11px',
    fontWeight: 800,
    color: '#6366F1',
    cursor: 'pointer',
    textTransform: 'uppercase',
};

const submitBtn: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    marginTop: '12px',
    background: '#111827', // Dark enterprise button
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '6px',
    transition: 'all 0.2s',
};

const errorBanner: React.CSSProperties = {
    background: '#FEF2F2',
    border: '1px solid #FEE2E2',
    color: '#B91C1C',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '24px',
    textAlign: 'center',
};

const footerStyle: React.CSSProperties = {
    marginTop: '32px',
    fontSize: '11px',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: '1.5',
};