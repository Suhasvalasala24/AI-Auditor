'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
  signals?: any;
};

type MetricApiResponse = {
  scoring?: {
    metric?: string;
    status?: 'OK' | 'NO_DATA';
    latest?: MetricPoint | null;
    trend?: MetricPoint[];
  };
};

type ModelComplianceRow = {
  model_id: string;
  model_name: string;
  score_100: number;
  band: string;
  executed_at?: string | null;
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

function exposureFromScore(score100: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score100 >= 75) return 'HIGH';
  if (score100 >= 45) return 'MEDIUM';
  return 'LOW';
}

function exposureColor(exposure: string) {
  const e = String(exposure || '').toUpperCase();
  if (e === 'LOW') return '#10b981';
  if (e === 'MEDIUM') return '#f59e0b';
  if (e === 'HIGH') return '#ef4444';
  return '#6b7280';
}

function safeDateLabel(executedAt: string | null | undefined, fallback: string) {
  if (!executedAt) return fallback;
  try {
    return new Date(executedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return fallback;
  }
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function CompliancePage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  // ✅ 1. INSTANT LOAD HOOKS (Replaces manual useEffects)
  const qp = selectedModelId ? `?model_id=${encodeURIComponent(selectedModelId)}` : '';
  const { data: payload, loading, error, refresh } = useMetricData<MetricApiResponse>(`/metrics/compliance${qp}`);
  const { data: models } = useMetricData<ModelRow[]>('/models');

  // --- State for Leaderboard ---
  const [modelRatings, setModelRatings] = useState<ModelComplianceRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // --- 2. Data Extraction ---
  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const score100 = Math.round(safeNumber(latest?.score_100, 0));
  const band = String(latest?.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  const regulatoryExposure = exposureFromScore(score100);
  const regulatoryExposureClr = exposureColor(regulatoryExposure);

  // --- 3. Compute Chart Data ---

  const breakdownData = useMemo(() => {
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

  // ✅ DYNAMIC REGULATION COVERAGE
  const regulationCoverage = useMemo(() => {
    const backendData = latest?.frameworks || {};
    const regMap = [
      { key: 'GDPR', label: 'GDPR', hint: 'Privacy & Consent' },
      { key: 'EUAI', label: 'EU AI Act', hint: 'Risk & Governance' },
      { key: 'DPDP', label: 'DPDP (India)', hint: 'Data Protection' },
      { key: 'ISO42001', label: 'ISO 42001', hint: 'AI Management Systems' },
      { key: 'SOC2', label: 'SOC 2', hint: 'Security & Controls' },
      { key: 'HIPAA', label: 'HIPAA', hint: 'Health Data Privacy' },
    ];

    return regMap.map((reg) => {
      // Logic: Backend sends 0.0-1.0 coverage score.
      // If 0 or missing, it implies pending audit or total failure.
      const rawScore = backendData[reg.key] ?? 0;
      const coverage = Math.round(rawScore * 100);
      
      let color = '#ef4444'; // Red (Poor coverage)
      if (coverage >= 80) color = '#10b981'; // Green (Good)
      else if (coverage >= 50) color = '#f59e0b'; // Orange (Partial)

      return { 
        regulation: reg.label, 
        coverage, 
        color, 
        covered: rawScore > 0,
        hint: reg.hint 
      };
    });
  }, [latest?.frameworks]);

  // Leaderboard Logic
  const loadComplianceLeaderboard = async () => {
    if (!models || models.length === 0) return;
    setLeaderboardLoading(true);
    try {
      const results = await Promise.all(
        models.map(async (m) => {
          try {
            const resp = await apiGet<MetricApiResponse>(`/metrics/compliance?model_id=${encodeURIComponent(m.model_id)}`);
            const l = resp?.scoring?.latest;
            if (!l) return null;
            return {
              model_id: m.model_id,
              model_name: m.name,
              score_100: safeNumber(l.score_100, 0),
              band: String(l.band || 'LOW').toUpperCase(),
              executed_at: l.executed_at || null,
            };
          } catch { return null; }
        })
      );
      const cleaned = results.filter(Boolean) as ModelComplianceRow[];
      cleaned.sort((a, b) => b.score_100 - a.score_100);
      setModelRatings(cleaned);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const modelsAtRiskCount = useMemo(() => modelRatings.filter((x) => x.score_100 >= 60).length, [modelRatings]);


  // --- UI Render ---

  if (loading && !payload) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-gray-500 font-medium">Analyzing Regulatory Compliance...</p>
        </div>
      </div>
    );
  }

  // Handle No Data
  if (error || !scoring || scoring.status === 'NO_DATA') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0 0 64px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
            Compliance & Governance
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Regulatory adherence monitoring and framework alignment.
          </p>
        </div>
        
        <div style={controlsBox}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={statusBadge('NO DATA', '#9ca3af')}>NO DATA</span>
           </div>
           <button style={btn} onClick={refresh}>Retry</button>
        </div>

        <div style={{ padding: 48, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>No Compliance Data Found</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Run an audit from the <b>Model Inventory</b> to generate compliance scores.
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
            Compliance & Governance
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Regulatory compliance monitoring and framework risk assessment.
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
            {Array.isArray(models) && models.map((m) => (
              <option key={m.id} value={m.model_id}>
                {m.name} ({m.model_id})
              </option>
            ))}
          </select>
          <span style={statusBadge('OK', '#10b981')}>OK</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={btn} onClick={refresh}>Refresh</button>
          <button style={btnPrimary} onClick={loadComplianceLeaderboard}>
            {leaderboardLoading ? 'Updating...' : 'Update Ratings'}
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <StatCard
          title="Compliance Coverage"
          value={`${Math.round(Math.max(0, 100 - score100))}%`}
          color="#10b981"
          sub="Adherence Rate"
        />
        <StatCard
          title="Regulatory Exposure"
          value={regulatoryExposure}
          color={regulatoryExposureClr}
          sub="Legal Risk Level"
        />
        <StatCard
          title="Models at Risk"
          value={String(modelsAtRiskCount)}
          color="#ef4444"
          sub="Requires Attention"
        />
      </div>

      {/* Regulation Coverage Table */}
      <div style={{ marginBottom: '42px' }}>
        <h2 style={sectionTitle}>Framework Coverage (Live Evidence)</h2>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={thStyle}>Regulation</th>
                <th style={thStyle}>Coverage</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {regulationCoverage.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <b>{item.regulation}</b>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.hint}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', maxWidth: '140px' }}>
                        <div style={{ width: `${item.coverage}%`, background: item.covered ? item.color : '#e5e7eb', height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: item.color }}>{item.covered ? `${item.coverage}%` : 'N/A'}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {item.covered ? (
                      <span style={{ color: item.color, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', background: `${item.color}15`, padding: '4px 8px', borderRadius: '4px' }}>Active</span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>Pending Audit</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown + Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '42px' }}>
        <ChartCard title="Scoring Breakdown (L/I/R)">
          <div style={{ height: '100%', display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <PieChart data={breakdownData} colors={['#3b82f6', '#f59e0b', '#dc2626']} />
            </div>
            <div style={{ width: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
              <div>Likelihood: <b>{breakdownData[0].value}%</b></div>
              <div>Impact: <b>{breakdownData[1].value}%</b></div>
              <div>Regulatory: <b>{breakdownData[2].value}%</b></div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Compliance Risk Trend">
          <BarChart data={trendBucketData} color={bandClr} />
        </ChartCard>
      </div>

      {/* Model Leaderboard */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={sectionTitle}>Model Compliance Ratings</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Model</th>
                <th style={thStyle}>Risk Score</th>
                <th style={thStyle}>Band</th>
                <th style={thStyle}>Last Audit</th>
              </tr>
            </thead>
            <tbody>
              {modelRatings.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Click "Update Ratings" to fetch model rankings.</td></tr>
              ) : (
                modelRatings.map((r, idx) => (
                  <tr key={`${r.model_id}_${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>#{idx + 1}</td>
                    <td style={tdStyle}><b>{r.model_name}</b> <span style={{ color: '#9ca3af', fontWeight: 400 }}>({r.model_id})</span></td>
                    <td style={tdStyle}>{Math.round(safeNumber(r.score_100, 0))}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', background: `${bandColor(r.band)}15`, color: bandColor(r.band), fontSize: '11px', fontWeight: '700' }}>
                        {r.band}
                      </span>
                    </td>
                    <td style={tdStyle}>{r.executed_at ? new Date(r.executed_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

const btnPrimary = {
  ...btn,
  background: '#111827',
  color: '#ffffff',
  border: '1px solid #111827'
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
const thStyle = { textAlign: 'left' as const, padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
const tdStyle = { padding: '16px 24px', fontSize: '13px', color: '#374151' };

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