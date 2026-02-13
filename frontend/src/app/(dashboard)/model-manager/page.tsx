'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';

// ---------------- Types & Helpers ----------------

type ModelRow = {
  id: number;
  model_id: string;
  name: string;
  version?: string;
  model_type?: string;
  connection_type?: string;
  created_at?: string;
  last_audit_status?: string | null;
  last_audit_time?: string | null;
  audit_frequency?: string; 
  current_progress?: number;
  total_prompts?: number;
};

type ExecutionStatus = 'NOT RUN' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
type RiskPosture = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

function parseStatus(raw?: string | null): { execution: ExecutionStatus; risk: RiskPosture } {
  const s = String(raw || '').toUpperCase().trim();
  if (!s || s === 'NULL' || s === 'NOT RUN') return { execution: 'NOT RUN', risk: '—' };
  if (s === 'PENDING') return { execution: 'PENDING', risk: '—' };
  if (s === 'RUNNING') return { execution: 'RUNNING', risk: '—' };
  if (s === 'FAILED') return { execution: 'FAILED', risk: '—' };
  if (s === 'CANCELLED') return { execution: 'CANCELLED', risk: '—' };
  if (s === 'AUDIT_PASS') return { execution: 'SUCCESS', risk: 'LOW' };
  if (s === 'AUDIT_WARN') return { execution: 'SUCCESS', risk: 'MEDIUM' };
  if (s === 'AUDIT_FAIL') return { execution: 'SUCCESS', risk: 'HIGH' };
  return { execution: 'SUCCESS', risk: '—' };
}

function badgeStyle(type: 'execution' | 'risk', value: string) {
  const v = String(value || '').toUpperCase();
  let bg = '#f3f4f6'; let color = '#374151'; let border = '#e5e7eb';
  if (type === 'execution') {
    if (v === 'SUCCESS') { bg = '#dcfce7'; color = '#166534'; border = '#86efac'; } 
    else if (v === 'RUNNING') { bg = '#dbeafe'; color = '#1d4ed8'; border = '#93c5fd'; } 
    else if (v === 'PENDING') { bg = '#fef9c3'; color = '#854d0e'; border = '#fde047'; } 
    else if (v === 'FAILED') { bg = '#fee2e2'; color = '#991b1b'; border = '#fca5a5'; } 
  }
  if (type === 'risk' && v !== '—') {
    if (v === 'LOW') { bg = '#dcfce7'; color = '#166534'; border = '#86efac'; } 
    else if (v === 'MEDIUM') { bg = '#ffedd5'; color = '#9a3412'; border = '#fdba74'; } 
    else if (v === 'HIGH') { bg = '#fee2e2'; color = '#991b1b'; border = '#fca5a5'; }
  }
  return { display: 'inline-block', padding: '6px 10px', fontSize: 11, fontWeight: 800, borderRadius: 6, border: `2px solid ${border}`, background: bg, color, textTransform: 'uppercase' as const, letterSpacing: '0.4px', lineHeight: 1 };
}

export default function ModelManagerPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const [modelNickname, setModelNickname] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // Simulation: Admin user
  const isAdmin = true;

  const loadModels = useCallback(async () => {
    try {
      const data = await apiGet<ModelRow[]>('/models');
      const list = Array.isArray(data) ? data : [];
      setModels(list);
      setIsPolling(list.some(m => {
        const p = parseStatus(m.last_audit_status);
        return p.execution === 'RUNNING' || p.execution === 'PENDING';
      }));
    } catch (err) { console.error(err); } finally { setLoadingModels(false); }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(loadModels, 2500);
    return () => clearInterval(interval);
  }, [isPolling, loadModels]);

  const handleFrequencyChange = async (modelId: number, freq: string) => {
    try {
        await apiPost(`/models/${modelId}/policy`, { audit_frequency: freq });
        await loadModels();
    } catch (err) { alert("Failed to update schedule"); }
  };

  async function addModel() {
    if (!modelNickname || !apiUrl) return alert('Nickname and URL required');
    const modelId = modelNickname.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setLoading(true);
    try {
      const request_template: any = { temperature };
      if (modelName) { request_template.model = modelName; request_template.messages = [{ role: 'user', content: '{{PROMPT}}' }]; } 
      else { request_template.input = '{{PROMPT}}'; }
      await apiPost('/models/register-with-connector', { model_id: modelId, name: modelNickname, endpoint: apiUrl, method: 'POST', headers: apiKey ? { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }, request_template, response_path: modelName ? 'choices[0].message.content' : 'output', description });
      setModalOpen(false); setModelNickname(''); setModelName(''); setApiUrl(''); setApiKey(''); setTemperature(0.7);
      await loadModels();
    } catch (err: any) { alert(`Error: ${err?.message}`); } finally { setLoading(false); }
  }

  async function deleteModel(modelId: string) {
    if (!confirm(`Are you sure you want to remove ${modelId}?`)) return;
    try { await apiDelete(`/models/${modelId}`); await loadModels(); } 
    catch (err: any) { alert(err.message); }
  }

  async function runAudit(modelId: string) {
    try { await apiPost(`/audits/model/${modelId}/run`); await loadModels(); } 
    catch (err: any) { alert(err?.message || 'Failed to run audit'); }
  }

  async function stopAudit(modelId: string) {
    try {
      const recent = await apiGet<any[]>(`/audits/model/${modelId}/recent`);
      if (recent && recent.length > 0 && (recent[0].audit_result === 'RUNNING' || recent[0].audit_result === 'PENDING')) {
        await apiPost(`/audits/${recent[0].audit_id}/stop`);
        await loadModels();
      }
    } catch { alert('Failed to stop audit'); }
  }

  return (
    <div style={{ padding: 32, background: '#fafafa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>Model Inventory</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Manage model connectors and adversarial test schedules.</p>
        </div>
        {isAdmin && <button style={primaryBtn} onClick={() => setModalOpen(true)}>+ Add Model</button>}
      </div>

      <div style={tableWrapper}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Model</th>
              <th style={thStyle}>Audit Result</th>
              <th style={thStyle}>Risk Posture</th>
              <th style={thStyle}>Schedule</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingModels ? (
               <tr><td colSpan={5} style={emptyStyle}>Loading inventory...</td></tr>
            ) : models.length === 0 ? (
               <tr><td colSpan={5} style={emptyStyle}>No models registered.</td></tr>
            ) : models.map((m) => {
              const parsed = parseStatus(m.last_audit_status);
              const progress = m.total_prompts ? (m.current_progress! / m.total_prompts!) * 100 : 0;

              return (
                <tr key={m.id} style={trStyle}>
                  <td style={tdStyle}>
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                    <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{m.model_id}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle('execution', parsed.execution)}>{parsed.execution}</span>
                    {parsed.execution === 'RUNNING' && m.total_prompts! > 0 && (
                        <div style={{ marginTop: 10, width: '150px' }}>
                            <div style={progBg}><div style={{ ...progFill, width: `${progress}%` }} /></div>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: 4, fontWeight: 700 }}>
                                {m.current_progress} / {m.total_prompts} PROMPTS
                            </div>
                        </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle('risk', parsed.risk)}>{parsed.risk}</span>
                  </td>
                  <td style={tdStyle}>
                    <select 
                      defaultValue={m.audit_frequency || 'manual'}
                      onChange={(e) => handleFrequencyChange(m.id, e.target.value)}
                      style={selectStyle}
                    >
                      <option value="manual">Manual</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={auditBtn} onClick={() => runAudit(m.model_id)}>Run</button>
                      {isAdmin && <button style={deleteBtn} onClick={() => deleteModel(m.model_id)}>🗑</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20, fontWeight: 900 }}>Register Connector</h2>
            <label style={labelStyle}>Nickname *</label>
            <input style={inputStyle} value={modelNickname} onChange={(e) => setModelNickname(e.target.value)} />
            <label style={labelStyle}>Deployment Name</label>
            <input style={inputStyle} value={modelName} onChange={(e) => setModelName(e.target.value)} />
            <label style={labelStyle}>API URL *</label>
            <input style={inputStyle} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
            <label style={labelStyle}>API Key</label>
            <input type="password" style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button style={secondaryBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={primaryBtn} onClick={addModel} disabled={loading}>{loading ? 'Registering…' : 'Add Model'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Styles ----------------
const tableWrapper = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' };
const thStyle = { padding: 16, textAlign: 'left' as const, fontSize: '12px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' as const };
const tdStyle = { padding: 20 };
const trStyle = { borderTop: '1px solid #f3f4f6' };
const emptyStyle = { padding: 48, textAlign: 'center' as const, color: '#9ca3af' };
const progBg = { width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' };
const progFill = { height: '100%', background: '#10b981', transition: 'width 0.4s ease' };
const selectStyle = { padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', fontWeight: 600, outline: 'none' };
const auditBtn = { padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' };
const deleteBtn = { padding: '8px 12px', background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '16px' };
const primaryBtn = { background: '#111827', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 };
const secondaryBtn = { flex: 1, padding: 12, background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' as const, marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: 16, border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const };
const modalOverlay = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', padding: 40, width: 480, borderRadius: '16px' };