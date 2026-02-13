// Error Message Component
export default function ErrorMessage({
    message,
    onRetry
}: {
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div
            style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '20px',
                margin: '20px 0',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                {/* Error Icon */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>

                {/* Message */}
                <div style={{ flex: 1 }}>
                    <h4
                        style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#dc2626',
                        }}
                    >
                        Error
                    </h4>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '14px',
                            color: '#991b1b',
                            lineHeight: '1.5',
                        }}
                    >
                        {message}
                    </p>

                    {onRetry && (
                        <button
                            onClick={onRetry}
                            style={{
                                marginTop: '12px',
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#dc2626',
                                background: 'white',
                                border: '1px solid #dc2626',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dc2626';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.color = '#dc2626';
                            }}
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
