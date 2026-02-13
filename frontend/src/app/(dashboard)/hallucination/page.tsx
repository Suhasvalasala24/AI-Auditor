'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  return '#06b6d4';                       // Cyan (Hallucination Theme)
}

function pct01(v: any) {
  return `${Math.round(safeNumber(v, 0) * 1000) / 10}%`;
}

function safeDateLabel(executedAt: string | null | undefined, auditId?: string) {
  if (!executedAt) return String(auditId || '-');
  try {
    return new Date(executedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return String(auditId || '-');
  }
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function HallucinationPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // ✅ 1. INSTANT LOAD HOOKS
  const qp = selectedModelId ? `?model_id=${encodeURIComponent(selectedModelId)}` : '';
  const { data: payload, loading, error, refresh } = useMetricData<MetricApiResponse>(`/metrics/hallucination${qp}`);
  const { data: models } = useMetricData<ModelRow[]>('/models');

  // --- 2. Data Extraction ---
  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const scoreNow = Math.round(safeNumber(latest?.score_100, 0));
  // "Groundedness" is the inverse of Hallucination Risk
  const groundedness = Math.max(0, 100 - scoreNow); 
  
  const band = String(latest?.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  const signals = (latest?.signals || {}) as Record<string, any>;
  
  // Counts from the backend signals
  const findingCount = Math.round(safeNumber(signals.finding_count, 0));
  const interactionCount = Math.round(safeNumber(signals.interactions, 0));

  // --- 3. Compute Chart Data ---

  const trendPoints = useMemo(() => {
    if (!Array.isArray(trend) || trend.length === 0) return [];
    return trend.slice(-12).map((x, idx) => ({
      name: safeDateLabel(x.executed_at, x.audit_id),
      value: safeNumber(x.score_100, 0),
    }));
  }, [trend]);

  const trendBucketData = useMemo(() => {
    const safeTrend = trendPoints.length ? trendPoints : [{ name: 'No Data', value: 0 }];
    return { 
      oneMonth: safeTrend.slice(-5), 
      sixMonths: safeTrend.slice(-8), 
      oneYear: safeTrend 
    };
  }, [trendPoints]);

  const scoringBreakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Likelihood', value: Math.round(safeNumber(latest.L, 0) * 100) },
      { name: 'Impact', value: Math.round(safeNumber(latest.I, 0) * 100) },
      { name: 'Regulatory', value: Math.round(safeNumber(latest.R, 0) * 100) },
    ];
  }, [latest]);

  // ✅ UPGRADED: Breakdown specific to the backend HallucinationMetric class
  const typeBreakdown = useMemo(() => {
    // Backend keys: 'hallucination_fabrication' (Critical) vs 'hallucination_admission' (Medium)
    const fabrication = safeNumber(signals.hallucination_fabrication, 0);
    const admission = safeNumber(signals.hallucination_admission, 0);
    
    // "Safe" responses are those that didn't trigger a finding
    const safeResponses = Math.max(0, interactionCount - (fabrication + admission));

    // Fallback for visualization if data is empty
    if (interactionCount === 0 && scoreNow > 0) {
        return [{ name: 'Detected Issues', value: 100 }];
    }

    return [
      { name: 'Total Fabrication', value: fabrication }, // Critical Risk
      { name: 'Refusal / Admission', value: admission }, // Mitigation Working
      { name: 'Grounded / Factual', value: safeResponses }, // Success
    ].filter(x => x.value > 0);
  }, [signals, interactionCount, scoreNow]);


  // --- UI Render ---

  if (loading && !payload) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-gray-500 font-medium">Verifying Factuality...</p>
        </div>
      </div>
    );
  }

  if (error || !scoring || scoring.status === 'NO_DATA') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0 0 64px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
            Hallucination Monitoring
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Factuality checks and ground-truth verification.
          </p>
        </div>

        <div style={controlsBox}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={statusBadge('NO DATA', '#9ca3af')}>NO DATA</span>
           </div>
           <button style={btn} onClick={refresh}>Retry</button>
        </div>

        <div style={{ padding: 48, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>No Audit Data Found</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Please run a new audit from the <b>Model Inventory</b> page to generate hallucination metrics.
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
            Hallucination Monitoring
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Factuality checks, ground-truth verification, and fabrication detection.
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
        <button style={btn} onClick={refresh}>
          Refresh Data
        </button>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <StatCard 
          title="Factuality Risk" 
          value={`${scoreNow}/100`} 
          color={bandClr} 
          sub="Hallucination Probability" 
        />
        <StatCard 
          title="Groundedness" 
          value={`${groundedness}%`} 
          color="#0891b2" 
          sub="Fact-Check Pass Rate" 
        />
        <StatCard 
          title="Fabrications Detected" 
          value={findingCount} 
          color="#ef4444" 
          sub="Known Falsehoods" 
        />
        <StatCard 
          title="Facts Verified" 
          value={`${interactionCount}`} 
          color="#374151" 
          sub="Total Prompts Tested" 
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        
        {/* Breakdown Chart */}
        <ChartCard title="Response Distribution">
          <div style={{ height: '100%', display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <PieChart 
                data={typeBreakdown} 
                colors={['#ef4444', '#f59e0b', '#10b981']} 
              />
            </div>
            <div style={{ width: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
              {typeBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ['#ef4444', '#f59e0b', '#10b981'][idx % 3] }} />
                  <span>{item.name}: <b>{item.value}</b></span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Trend Chart */}
        <ChartCard title="Hallucination Risk Trend">
          <BarChart 
            data={trendBucketData} 
            color={bandClr} 
          />
        </ChartCard>

      </div>

      {/* Detailed Analysis & Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '48px' }}>
        
        <ChartCard title="Scoring Components">
          <PieChart data={scoringBreakdown} colors={['#06b6d4', '#f59e0b', '#dc2626']} />
        </ChartCard>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: '20px' }}>
            Mitigation Strategies
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <ActionItem 
              risk="High" 
              title="Implement RAG" 
              desc="Connect the model to a Vector Database to ground responses in retrieved documents rather than parametric memory." 
            />
            <ActionItem 
              risk="Med" 
              title="Citation Enforcement" 
              desc="Update system prompt to require: 'If you cannot find the answer in the context, state that you do not know.'" 
            />
            <ActionItem 
              risk="High" 
              title="Temperature Adjustment" 
              desc="Lower model temperature (e.g. 0.0 - 0.2) for factual tasks to reduce creative generation." 
            />
            <ActionItem 
              risk="Low" 
              title="Logit Bias" 
              desc="Apply negative logit bias to phrases like 'I imagine', 'Hypothetically', or known fictional entities." 
            />
          </div>
        </div>
      </div>

      {/* Audit History Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Recent Audit History</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Model</th>
              <th style={thStyle}>Risk Score</th>
              <th style={thStyle}>Risk Band</th>
              <th style={thStyle}>Likelihood</th>
              <th style={thStyle}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {trend.slice().reverse().slice(0, 5).map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={tdStyle}>{row.executed_at ? new Date(row.executed_at).toLocaleString() : '-'}</td>
                <td style={tdStyle}><b>{row.model_name || row.model_id || '-'}</b></td>
                <td style={tdStyle}>{Math.round(safeNumber(row.score_100, 0))}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '6px',
                    background: `${bandColor(row.band || 'LOW')}15`, // 15% opacity bg
                    color: bandColor(row.band || 'LOW'), 
                    fontSize: '11px', 
                    fontWeight: '700' 
                  }}>
                    {row.band || 'LOW'}
                  </span>
                </td>
                <td style={tdStyle}>{pct01(row.L)}</td>
                <td style={tdStyle}>{pct01(row.I)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

const thStyle = { textAlign: 'left' as const, padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
const tdStyle = { padding: '16px 24px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f3f4f6' };

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

function ActionItem({ risk, title, desc }: any) {
  const color = risk === 'High' ? '#ef4444' : risk === 'Med' ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ marginTop: '4px', width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>{desc}</div>
      </div>
    </div>
  );
}