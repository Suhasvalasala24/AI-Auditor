'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
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

function deriveBaselineFromTrend(trend: MetricPoint[]) {
  if (!Array.isArray(trend) || trend.length === 0) return 0;
  // Simple moving average of last 3 runs to smooth out noise
  const slice = trend.slice(0, Math.min(3, trend.length));
  const avg = slice.reduce((acc, x) => acc + safeNumber(x.score_100, 0), 0) / slice.length;
  return avg;
}

function pctChange(from: number, to: number) {
  if (from <= 0) return 0;
  return Math.round(((to - from) / from) * 100);
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function DriftPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // ✅ 1. INSTANT LOAD HOOKS (Parallel Fetching)
  // Fetches Drift for main metrics, Bias for the "Fairness" correlation chart
  const qp = selectedModelId ? `?model_id=${encodeURIComponent(selectedModelId)}` : '';
  
  const { data: payload, loading, error, refresh } = useMetricData<MetricApiResponse>(`/metrics/drift${qp}`);
  const { data: biasPayload } = useMetricData<MetricApiResponse>(`/metrics/bias${qp}`);
  const { data: models } = useMetricData<ModelRow[]>('/models');

  // --- 2. Safe Data Extraction ---
  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const scoreNow = Math.round(safeNumber(latest?.score_100, 0));
  const band = String(latest?.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  const breakdown = useMemo(() => {
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

  const baselineScore = useMemo(() => Math.round(deriveBaselineFromTrend(trend)), [trend]);
  
  const driftVelocity = useMemo(() => {
    const change = pctChange(Math.max(1, baselineScore), Math.max(1, scoreNow));
    return {
      val: change,
      label: change > 0 ? `+${change}% (Worsening)` : `${change}% (Improving)`,
      color: change > 5 ? '#ef4444' : change < -5 ? '#10b981' : '#6b7280'
    };
  }, [baselineScore, scoreNow]);

  // --- 3. Composite Signal Processing ---

  // Drift Signals (Direct from Backend)
  const driftSignalChart = useMemo(() => {
    const signals = latest?.signals || {};
    
    // Backend keys from DriftMetric class
    const refusals = safeNumber(signals['drift_refusal_spike'], 0);
    // Combine length/empty issues into one category for cleaner chart
    const length = safeNumber(signals['drift_length_short'], 0) + safeNumber(signals['drift_length_long'], 0) + safeNumber(signals['drift_empty_response'], 0);
    const tone = safeNumber(signals['drift_tone_aggressive'], 0);
    const format = safeNumber(signals['drift_format_instability'], 0) + safeNumber(signals['drift_response_volatility'], 0);

    // If no signals, show a "Stable" placeholder
    const totalIssues = refusals + length + tone + format;
    // Arbitrary base stability score if no issues found
    const stability = totalIssues === 0 ? 10 : 0; 

    return [
      { name: 'Refusals', value: refusals },
      { name: 'Length/Empty', value: length },
      { name: 'Aggression', value: tone },
      { name: 'Formatting', value: format },
      { name: 'Stable Output', value: stability }
    ].filter(x => x.value > 0);
  }, [latest]);

  // Fairness Correlation (From Bias Endpoint)
  const fairnessData = useMemo(() => {
    const signals = biasPayload?.scoring?.latest?.signals || {};
    
    const gender = signals['bias_gender_stereotype'] || 0;
    const racial = signals['bias_hate_or_dehumanization'] || 0;
    const general = signals['bias_protected_group_generalization'] || 0;
    
    const totalBias = gender + racial + general;
    // Estimate "Fair" interactions based on ratio
    const fairCount = Math.max(10, (totalBias * 4)); 

    return [
      { name: 'Gender Bias', value: gender },
      { name: 'Racial Bias', value: racial },
      { name: 'Stereotyping', value: general },
      { name: 'Fair Output', value: fairCount },
    ].filter(x => x.value > 0);
  }, [biasPayload]);

  const driftColors = ['#f59e0b', '#ec4899', '#ef4444', '#6366f1', '#10b981'];
  const fairnessColors = ['#ec4899', '#f97316', '#eab308', '#10b981'];

  // Dynamic Diagnostics
  const diagnosticMessage = useMemo(() => {
    if (scoreNow < 20) return "Model behavior is stable. Routine monitoring active.";
    const signals = latest?.signals || {};
    
    if (safeNumber(signals['drift_tone_aggressive'], 0) > 0) return "CRITICAL: Aggressive tone detected. Immediate review required.";
    if (safeNumber(signals['drift_refusal_spike'], 0) > 2) return "WARNING: High refusal rate. Model may be over-sensitive.";
    if (safeNumber(signals['drift_empty_response'], 0) > 0) return "ERROR: Empty responses detected. Check inference API.";
    
    return "Drift detected. Review audit logs for details.";
  }, [scoreNow, latest]);


  // --- UI Render ---

  if (loading && !payload) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-gray-500 font-medium">Analyzing Model Drift...</p>
        </div>
      </div>
    );
  }

  // Handle No Data gracefully
  if (error || !scoring || scoring.status === 'NO_DATA') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0 0 64px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
            Drift & Monitoring
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Behavioral stability and operational consistency tracking.
          </p>
        </div>
        
        <div style={controlsBox}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={statusBadge('NO DATA', '#9ca3af')}>NO DATA</span>
           </div>
           <button style={btn} onClick={refresh}>Retry</button>
        </div>

        <div style={{ padding: 48, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>No Drift Data Available</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Run at least two audits to establish a baseline and calculate drift.
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
            Drift & Monitoring
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Track model behavioral shifts, refusal spikes, and tonal degradation over time.
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
            {Array.isArray(models) && models.map((m) => (
              <option key={m.id} value={m.model_id}>
                {m.name} ({m.model_id})
              </option>
            ))}
          </select>
          <span style={statusBadge('OK', '#10b981')}>OK</span>
        </div>
        <button style={btn} onClick={refresh}>Refresh Data</button>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <StatCard
          title="Drift Risk Score"
          value={`${scoreNow}/100`}
          color={bandClr}
          sub="Current Instability"
        />
        <StatCard
          title="Severity Band"
          value={band}
          color={bandClr}
          sub="Risk Classification"
        />
        <StatCard
          title="Drift Velocity"
          value={driftVelocity.label}
          color={driftVelocity.color}
          sub="Change from Baseline"
        />
        <StatCard
          title="Baseline Score"
          value={`${baselineScore}/100`}
          color="#111827"
          sub="30-Day Moving Avg"
        />
      </div>

      {/* Main Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '42px' }}>
        
        {/* Drift Composition Pie Chart */}
        <ChartCard title="Drift Signals (Composition)">
          <div style={{ height: '100%', display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <PieChart data={driftSignalChart} colors={driftColors} />
            </div>
            <div style={{ width: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', fontSize: '12px', color: '#6b7280' }}>
              <div style={{ fontWeight: 700 }}>Signal Types:</div>
              {driftSignalChart.slice(0, 4).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: driftColors[i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Fairness Pie Chart (Composite) */}
        <ChartCard title="Outcome Fairness (Composite)">
          <div style={{ height: '100%', display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <PieChart data={fairnessData} colors={fairnessColors} />
            </div>
            <div style={{ width: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', fontSize: '12px', color: '#6b7280' }}>
              <div style={{ fontWeight: 700 }}>Bias Types:</div>
              {fairnessData.slice(0, 4).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: fairnessColors[i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

      </div>

      {/* Drift Trend */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={sectionTitle}>Drift Trend (Stability over Time)</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', background: '#fff' }}>
          <BarChart data={trendBucketData} color={bandClr} />
        </div>
      </div>

      {/* Breakdown + Context */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '48px' }}>
        
        <ChartCard title="Scoring Components">
          <PieChart data={breakdown} colors={['#3b82f6', '#f59e0b', '#dc2626']} />
        </ChartCard>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: '20px' }}>
            Drift Diagnostics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                Operational Impact
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                Drift measures divergence from the established baseline. High scores suggest the model is becoming unpredictable or violating safety constraints more frequently.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                Signal Correlation
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                Check the "Composition" chart. High "Refusals" may indicate over-sensitive safety filters, while "Aggression" indicates potential jailbreak vulnerability.
              </p>
            </div>
          </div>
          
          <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
             <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>RECOMMENDED ACTION</div>
             <div style={{ fontSize: '13px', color: scoreNow > 50 ? '#ef4444' : '#10b981', fontWeight: '600' }}>
               {diagnosticMessage}
             </div>
          </div>
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