'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiGetBlob, apiPost } from '@/lib/api-client';

type Interaction = {
    prompt_id: string;
    prompt: string;
    response: string;
    latency: number;
    created_at?: string | null;
};

export default function AuditDetailPage({ params }: { params: { auditId: string } }) {
    const auditId = params.auditId;
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('');
    const [downloading, setDownloading] = useState(false);
    const pollRef = useRef<any>(null);

    async function loadData() {
        try {
            const data = await apiGet<Interaction[]>(`/audits/${auditId}/interactions`);
            setInteractions(Array.isArray(data) ? data : []);
            
            // Check status for live updates
            const auditRes = await apiGet<any>(`/audits/${auditId}/findings-grouped`);
            const currentStatus = auditRes?.audit?.execution_status || '';
            setStatus(currentStatus);

            if (currentStatus === 'RUNNING' || currentStatus === 'PENDING') {
                if (!pollRef.current) pollRef.current = setInterval(loadData, 3000);
            } else {
                if (pollRef.current) clearInterval(pollRef.current);
            }
        } catch {
            if (pollRef.current) clearInterval(pollRef.current);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [auditId]);

    async function stopAudit() {
        try { await apiPost(`/audits/${auditId}/stop`); loadData(); } catch { alert('Failed to stop'); }
    }

    async function downloadReport() {
        try {
            setDownloading(true);
            const blob = await apiGetBlob(`/audits/${auditId}/download`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${auditId}.json`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch (err: any) { alert(`Download failed: ${err?.message}`); } 
        finally { setDownloading(false); }
    }

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh', padding: 32 }}>
            <div style={header}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>
                        Technical Audit Log <span style={{ fontFamily: 'monospace', color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>#{auditId}</span>
                    </h1>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <StatusBadge status={status} />
                        {(status === 'RUNNING' || status === 'PENDING') && (
                            <button onClick={stopAudit} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                                Force Stop
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => window.history.back()} style={btnOutline}>← Back</button>
                    <button onClick={downloadReport} disabled={downloading || status === 'RUNNING'} style={{ ...primaryBtn, opacity: (downloading || status === 'RUNNING') ? 0.6 : 1 }}>
                        {downloading ? 'Downloading...' : 'Download Full JSON'}
                    </button>
                </div>
            </div>

            {loading ? <div style={emptyBox}>Loading technical evidence logs...</div> : (
                <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
                    {interactions.length === 0 ? <div style={emptyBox}>No interactions recorded yet.</div> : interactions.map((item, index) => (
                        <div key={index} style={interactionCard}>
                            <div style={metaRow}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>Prompt ID</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{item.prompt_id}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>Latency</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{item.latency} ms</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                                <div>
                                    <div style={blockTitle}>Input Prompt</div>
                                    <pre style={boxStyle}>{item.prompt}</pre>
                                </div>
                                <div>
                                    <div style={blockTitle}>Model Response</div>
                                    <pre style={boxStyle}>{item.response}</pre>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = (status || '').toUpperCase();
    let bg = '#f3f4f6', color = '#374151', border = '#e5e7eb';
    if (s === 'RUNNING' || s === 'PENDING') { bg = '#eff6ff'; color = '#1d4ed8'; border = '#bfdbfe'; }
    else if (s === 'SUCCESS' || s === 'AUDIT_PASS') { bg = '#dcfce7'; color = '#166534'; border = '#86efac'; }
    else if (s === 'FAILED' || s === 'CANCELLED') { bg = '#fee2e2'; color = '#991b1b'; border = '#fca5a5'; }
    return <span style={{ padding: '4px 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', background: bg, color, border: `1px solid ${border}`, borderRadius: 4 }}>{s || 'UNKNOWN'}</span>;
}

const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: '2px solid #e5e7eb' };
const primaryBtn = { padding: '10px 16px', background: '#111827', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, borderRadius: 6, cursor: 'pointer' };
const btnOutline = { padding: '10px 16px', background: '#fff', color: '#111827', border: '2px solid #e5e7eb', fontSize: 13, fontWeight: 700, borderRadius: 6, cursor: 'pointer' };
const emptyBox = { marginTop: 20, background: '#fff', border: '1px solid #e5e7eb', padding: 40, textAlign: 'center' as const, borderRadius: 8, color: '#6b7280' };
const interactionCard = { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 8, padding: 20 };
const metaRow = { display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #f3f4f6', paddingBottom: 12 };
const blockTitle = { fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: 6 };
const boxStyle = { background: '#f9fafb', border: '1px solid #e5e7eb', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap' as const, fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace', color: '#374151', maxHeight: 300, overflowY: 'auto' as const };