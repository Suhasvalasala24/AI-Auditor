'use client';

import React, { useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { useMetricData } from '@/lib/use-metric-data'; // ✅ Instant Load Hook
import { apiGet, safeNumber } from '@/lib/api-client';

/* =========================================================
   TYPES
========================================================= */

type ModelRow = {
  id: number;
  model_id: string;
  name: string;
};

type MetricPoint = {
  audit_id?: string;
  executed_at?: string | null;
  model_id?: string;
  model_name?: string;
  score_100?: number;
  band?: string;
  L?: number;
  I?: number;
  R?: number;
  frameworks?: Record<string, number>;
  signals?: Record<string, any>;
};

type MetricApiResponse = {
  scoring?: {
    metric?: string;
    status?: 'OK' | 'NO_DATA';
    latest?: MetricPoint | null;
    trend?: MetricPoint[];
  };
};

/* =========================================================
   HELPERS
========================================================= */

function bandColor(band: string) {
  const b = String(band || '').toUpperCase();
  if (b === 'CRITICAL') return '#ef4444'; // Red
  if (b === 'SEVERE') return '#f97316';   // Orange
  if (b === 'HIGH') return '#f59e0b';     // Yellow
  if (b === 'MODERATE') return '#3b82f6'; // Blue
  return '#10b981';                       // Green
}

function safeDateLabel(executedAt: string | null | undefined, auditId?: string) {
  if (!executedAt) return String(auditId || '-');
  try {
    return new Date(executedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return String(auditId || '-');
  }
}

function humanizeSignal(key: string) {
  return key
    .replace(/^phi_/, '')
    .replace(/^medical_/, '')
    .replace(/_detected$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function PublicHealthPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // ✅ 1. INSTANT LOAD HOOKS (Replaces manual useEffects)
  const qp = selectedModelId ? `?model_id=${encodeURIComponent(selectedModelId)}` : '';
  const { data: payload, loading, error, refresh } = useMetricData<MetricApiResponse>(`/metrics/phi${qp}`);
  const { data: models } = useMetricData<ModelRow[]>('/models');

  // --- 2. Safe Data Extraction ---
  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const scoreNow = Math.round(safeNumber(latest?.score_100, 0));
  const band = String(latest?.band || 'LOW').toUpperCase();
  const clr = bandColor(band);

  const signals = (latest?.signals || {}) as Record<string, any>;
  const frameworks = (latest?.frameworks || {}) as Record<string, any>;

  const findingCount = Math.round(safeNumber(signals.finding_count, 0));
  
  // Use precise count if available, else fallback
  const displayCount = Math.round(safeNumber(signals.interactions, 0));

  // --- 3. Compute Chart Data ---

  const scoringBreakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Likelihood', value: Math.round(safeNumber(latest.L, 0) * 100) },
      { name: 'Impact', value: Math.round(safeNumber(latest.I, 0) * 100) },
      { name: 'Regulatory', value: Math.round(safeNumber(latest.R, 0) * 100) },
    ];
  }, [latest]);

  const trendBucketData = useMemo(() => {
    const points = trend.slice(-12).map((x, idx) => ({
      name: safeDateLabel(x.executed_at, x.audit_id),
      value: safeNumber(x.score_100, 0),
    }));
    const safeTrend = points.length ? points : [{ name: 'No Data', value: 0 }];
    return { 
      oneMonth: safeTrend.slice(-5), 
      sixMonths: safeTrend.slice(-8), 
      oneYear: safeTrend 
    };
  }, [trend]);

  const frameworkBreakdownChart = useMemo(() => {
    const hipaa = safeNumber(frameworks.HIPAA, 0);
    const euai = safeNumber(frameworks.EUAI, 0);
    const fda = safeNumber(frameworks.FDA, 0); // SAMD Risk

    return [
      { name: 'HIPAA', value: Math.round(hipaa * 100) },
      { name: 'EU AI Act', value: Math.round(euai * 100) },
      { name: 'FDA / SAMD', value: Math.round(fda * 100) },
    ];
  }, [frameworks]);

  // Live Category List (Dynamic from Backend Signals)
  // This extracts keys like 'phi_leakage_detected' and counts them
  const categoryList = useMemo(() => {
    return Object.entries(signals)
      .filter(([k]) => k !== 'finding_count' && k !== 'interactions' && k !== 'frequency_ratio')
      .map(([k, v]) => ({
        label: humanizeSignal(k),
        count: Number(v),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [signals]);


  // --- UI Render ---

  if (loading && !payload) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-gray-500 font-medium">Analyzing Medical Safety...</p>
        </div>
      </div>
    );
  }

  if (error || !scoring || scoring.status === 'NO_DATA') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0 0 64px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
            Public Health & Medical Safety
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Medical triage verification, PHI leakage prevention, and dangerous advice blocking.
          </p>
        </div>
        
        <div style={controlsBox}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={statusBadge('NO DATA', '#9ca3af')}>NO DATA</span>
           </div>
           <button style={btn} onClick={refresh}>Retry</button>
        </div>

        <div style={{ padding: 48, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>No Medical Safety Data</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Run an audit to test medical triage and PHI safeguards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0 0 64px 0' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Public Health & Medical Safety
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Auditing for dangerous medical advice, triage failures, and PHI exposure.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Live Monitoring</span>
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
            AUTO-POLLING ACTIVE
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={controlsBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>TARGET MODEL:</span>
          <select 
            style={selectStyle} 
            value={selectedModelId} 
            onChange={(e) => setSelectedModelId(e.target.value)} 
            disabled={!models}
          >
            <option value="">Global View (All Models)</option>
            {Array.isArray(models) && models.map((m) => <option key={m.id} value={m.model_id}>{m.name}</option>)}
          </select>
          <span style={statusBadge('OK', '#10b981')}>OK</span>
        </div>
        <button style={btn} onClick={refresh}>Refresh Data</button>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <StatCard 
          title="Medical Risk Score" 
          value={`${scoreNow}/100`} 
          color={clr} 
          sub="Safety Probability" 
        />
        <StatCard 
          title="Risk Band" 
          value={band} 
          color={clr} 
          sub="Severity Level" 
        />
        <StatCard 
          title="Safety Violations" 
          value={findingCount} 
          color="#1f2937" 
          sub="Unsafe Responses" 
        />
        <StatCard 
          title="Triage Scenarios" 
          value={displayCount} 
          color="#3b82f6" 
          sub="Emergency Prompts Tested" 
        />
      </div>

      {/* Main Charts: Categories + Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        
        {/* Detected Categories List */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0', overflow: 'hidden', height: '320px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Detected Violations</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {categoryList.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>
                Clean Audit - No violations detected.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {categoryList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: '#1f2937', fontWeight: '600' }}>{item.label}</td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: '#ef4444', fontWeight: '800', textAlign: 'right' }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Risk Trend */}
        <ChartCard title="Safety Risk Trend">
          <BarChart data={trendBucketData} color={clr} />
        </ChartCard>

      </div>

      {/* Breakdown & Frameworks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
        
        <ChartCard title="Scoring Components">
          <PieChart data={scoringBreakdown} colors={['#3b82f6', '#f59e0b', '#dc2626']} />
        </ChartCard>

        <ChartCard title="Regulatory Pressure">
          <PieChart data={frameworkBreakdownChart} colors={['#1f2937', '#10b981', '#6366f1']} />
        </ChartCard>

      </div>

      {/* Mitigation Actions */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>Medical Safeguard Plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <ActionItem 
            title="Semantic Triage Routing" 
            text="Implement a classifier to intercept 'emergency' keywords (pain, suicide) and route to a static disclaimer." 
          />
          <ActionItem 
            title="System Prompt Constraints" 
            text="Hard-code instructions: 'You are an AI, not a doctor. Do not provide diagnosis. Recommend seeing a professional.'" 
          />
          <ActionItem 
            title="Database Scrubbing (RAG)" 
            text="Ensure vector databases are scrubbed of any real patient names or IDs (PHI) before ingestion." 
          />
        </div>
      </div>

    </div>
  );
}

/* =========================================================
   STYLES & COMPONENTS
========================================================= */

const controlsBox = { 
  border: '1px solid #e5e7eb', 
  background: '#f9fafb',
  borderRadius: '12px', 
  padding: '16px 24px', 
  marginBottom: '32px', 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center' 
};

const selectStyle = { 
  padding: '8px 12px', 
  border: '1px solid #d1d5db', 
  borderRadius: '6px', 
  fontSize: '13px', 
  fontWeight: '600', 
  color: '#111827', 
  outline: 'none', 
  minWidth: '220px' 
};

const btn = { 
  padding: '8px 16px', 
  background: '#ffffff', 
  border: '1px solid #d1d5db', 
  borderRadius: '6px', 
  fontSize: '13px', 
  fontWeight: '700', 
  color: '#374151', 
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};

const statusBadge = (text: string, color: string) => ({ 
  border: `2px solid ${color}`, 
  color, 
  padding: '6px 10px', 
  fontSize: 12, 
  fontWeight: 900, 
  textTransform: 'uppercase' as const, 
  letterSpacing: '0.5px', 
  display: 'inline-block',
  borderRadius: '6px'
});

const sectionTitle = { fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '16px', textTransform: 'uppercase' as const, letterSpacing: '-0.01em' };

function StatCard({ title, value, color, sub }: any) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: '800', color: color, marginBottom: '4px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>{sub}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', height: '320px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '20px', textTransform: 'uppercase' }}>{title}</h3>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function ActionItem({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}