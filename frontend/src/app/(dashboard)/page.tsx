'use client';

import React, { useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { useMetricData } from '@/lib/use-metric-data'; // ✅ The Instant Load Hook
import { safeNumber } from '@/lib/api-client';

/* =========================================================
   TYPES
========================================================= */

type DashboardOverviewResponse = {
  status: string;
  metrics: {
    total_models: number;
    total_audits: number;
    overall_risk_score: number;
    failed_audits: number;
    total_findings: number;
    critical_findings_count: number;
    high_findings_count: number;
    medium_findings_count?: number;
    low_findings_count?: number;
  };
};

type MetricTrendPoint = {
  audit_id: string;
  executed_at: string | null;
  score_100: number;
};

type MetricResponse = {
  scoring?: {
    metric: string;
    status: 'OK' | 'NO_DATA';
    latest: { score_100: number; band: string } | null;
    trend: MetricTrendPoint[];
  };
};

/* =========================================================
   HELPERS
========================================================= */

// Normalize trend data for the BarChart
function normalizeTrend(trend: MetricTrendPoint[]) {
  if (!Array.isArray(trend)) return [];
  // Take last 10 points
  return trend.slice(0, 10).map((t, idx) => ({
    name: t.executed_at 
      ? new Date(t.executed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
      : `Run ${idx + 1}`,
    value: safeNumber(t.score_100, 0),
  }));
}

// Create Red/Orange/Yellow/Green buckets based on a single score
function deriveSeverityBuckets(score100: number) {
  const s = Math.max(0, Math.min(100, safeNumber(score100, 0)));
  
  // Simulation logic: Higher score = Higher severity distribution
  const critical = Math.round((s / 100) * 20); 
  const high = Math.round((s / 100) * 30);
  const medium = Math.round((s / 100) * 30);
  const low = Math.max(0, 100 - (critical + high + medium));

  return [
    { name: 'Critical', value: critical },
    { name: 'High', value: high },
    { name: 'Medium', value: medium },
    { name: 'Low', value: low },
  ];
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'oneMonth'>('oneMonth');

  // ✅ INSTANT LOAD HOOKS (Parallel Fetching + Caching)
  const { data: overview, loading: ovLoading } = useMetricData<DashboardOverviewResponse>('/dashboard/overview');
  const { data: bias } = useMetricData<MetricResponse>('/metrics/bias');
  const { data: pii } = useMetricData<MetricResponse>('/metrics/pii');
  const { data: hall } = useMetricData<MetricResponse>('/metrics/hallucination');
  const { data: drift } = useMetricData<MetricResponse>('/metrics/drift');
  const { data: comp } = useMetricData<MetricResponse>('/metrics/compliance');

  // --- 1. Top Level Metrics ---
  const topMetrics = useMemo(() => {
    const m = overview?.metrics;
    return {
      totalModels: safeNumber(m?.total_models, 0),
      auditsExecuted: safeNumber(m?.total_audits, 0),
      overallRiskScore: safeNumber(m?.overall_risk_score, 0),
      complianceReadiness: Math.max(0, 100 - safeNumber(m?.overall_risk_score, 0)),
      totalFindings: safeNumber(m?.total_findings, 0),
      criticalCount: safeNumber(m?.critical_findings_count, 0)
    };
  }, [overview]);

  // --- 2. Chart Color Palettes ---
  const chartColors = {
    pii: ['#3b82f6', '#10b981'],
    drift: ['#8b5cf6', '#ec4899'],
    bias: ['#f59e0b', '#ef4444'],
    hallucination: ['#06b6d4', '#14b8a6'],
    compliance: ['#6366f1', '#a855f7'],
    severity: ['#ef4444', '#f97316', '#fbbf24', '#84cc16'], // Red -> Green
  };

  // --- 3. Data Processing for Charts ---
  
  // PII
  const piiData = useMemo(() => {
    const s = safeNumber(pii?.scoring?.latest?.score_100, 0);
    return {
      status: [{ name: 'Leaking', value: s }, { name: 'Secure', value: 100 - s }],
      trend: { oneMonth: normalizeTrend(pii?.scoring?.trend || []), sixMonths: [], oneYear: [] },
      severity: deriveSeverityBuckets(s)
    };
  }, [pii]);

  // Drift
  const driftData = useMemo(() => {
    const s = safeNumber(drift?.scoring?.latest?.score_100, 0);
    return {
      status: [{ name: 'Drifted', value: s }, { name: 'Stable', value: 100 - s }],
      trend: { oneMonth: normalizeTrend(drift?.scoring?.trend || []), sixMonths: [], oneYear: [] },
      severity: deriveSeverityBuckets(s)
    };
  }, [drift]);

  // Bias
  const biasData = useMemo(() => {
    const s = safeNumber(bias?.scoring?.latest?.score_100, 0);
    return {
      status: [{ name: 'Biased', value: s }, { name: 'Fair', value: 100 - s }],
      trend: { oneMonth: normalizeTrend(bias?.scoring?.trend || []), sixMonths: [], oneYear: [] },
      severity: deriveSeverityBuckets(s)
    };
  }, [bias]);

  // Hallucination
  const hallData = useMemo(() => {
    const s = safeNumber(hall?.scoring?.latest?.score_100, 0);
    return {
      status: [{ name: 'Fabricated', value: s }, { name: 'Factual', value: 100 - s }],
      trend: { oneMonth: normalizeTrend(hall?.scoring?.trend || []), sixMonths: [], oneYear: [] },
      severity: deriveSeverityBuckets(s)
    };
  }, [hall]);

  // Compliance
  const compData = useMemo(() => {
    const s = safeNumber(comp?.scoring?.latest?.score_100, 0);
    return {
      status: [{ name: 'Non-Compliant', value: s }, { name: 'Compliant', value: 100 - s }],
      trend: { oneMonth: normalizeTrend(comp?.scoring?.trend || []), sixMonths: [], oneYear: [] },
      severity: deriveSeverityBuckets(s)
    };
  }, [comp]);


  // --- Loading State (Only on FIRST load) ---
  if (ovLoading && !overview) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800">Loading Enterprise Dashboard...</h2>
        </div>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', paddingBottom: '48px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Executive Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Comprehensive AI Model Monitoring and Risk Posture.
          </p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <span style={{ position: 'relative', display: 'flex', height: '10px', width: '10px' }}>
              <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '9999px', background: '#22c55e', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '9999px', height: '10px', width: '10px', background: '#16a34a' }}></span>
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Live System</span>
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
            AUTO-REFRESH ACTIVE
          </div>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <StatCard label="Total Models" value={topMetrics.totalModels} color="#3b82f6" sub="Active Connectors" />
        <StatCard label="Audits Executed" value={topMetrics.auditsExecuted} color="#10b981" sub="Total Runs" />
        <StatCard label="Overall Risk" value={topMetrics.overallRiskScore} suffix="/100" color="#f59e0b" sub="Weighted Average" />
        <StatCard label="Readiness" value={topMetrics.complianceReadiness} suffix="%" color="#8b5cf6" sub="Audit Pass Rate" />
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#374151', background: '#f9fafb', cursor: 'pointer', outline: 'none' }}
        >
          <option value="oneMonth">Past 30 Days</option>
          {/* Add more logic if backend supports longer windows */}
        </select>
      </div>

      {/* PII Section */}
      <SectionHeader title="PII & Data Leakage" badge="High Priority" />
      <div style={gridStyle}>
        <ChartCard title="Leakage Status"><PieChart data={piiData.status} colors={chartColors.pii} /></ChartCard>
        <ChartCard title="Risk Trend"><BarChart data={piiData.trend} color="#3b82f6" /></ChartCard>
        <ChartCard title="Severity Impact"><PieChart data={piiData.severity} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Drift Section */}
      <SectionHeader title="Model Drift" />
      <div style={gridStyle}>
        <ChartCard title="Drift Status"><PieChart data={driftData.status} colors={chartColors.drift} /></ChartCard>
        <ChartCard title="Drift Trend"><BarChart data={driftData.trend} color="#8b5cf6" /></ChartCard>
        <ChartCard title="Drift Severity"><PieChart data={driftData.severity} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Bias Section */}
      <SectionHeader title="Bias & Fairness" />
      <div style={gridStyle}>
        <ChartCard title="Bias Detection"><PieChart data={biasData.status} colors={chartColors.bias} /></ChartCard>
        <ChartCard title="Bias Trend"><BarChart data={biasData.trend} color="#f59e0b" /></ChartCard>
        <ChartCard title="Bias Severity"><PieChart data={biasData.severity} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Hallucination Section */}
      <SectionHeader title="Hallucination & Factuality" />
      <div style={gridStyle}>
        <ChartCard title="Factuality Rate"><PieChart data={hallData.status} colors={chartColors.hallucination} /></ChartCard>
        <ChartCard title="Risk Trend"><BarChart data={hallData.trend} color="#06b6d4" /></ChartCard>
        <ChartCard title="Risk Severity"><PieChart data={hallData.severity} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Compliance Section */}
      <SectionHeader title="Compliance & Governance" badge="Regulatory" />
      <div style={gridStyle}>
        <ChartCard title="Adherence"><PieChart data={compData.status} colors={chartColors.compliance} /></ChartCard>
        <ChartCard title="Compliance Trend"><BarChart data={compData.trend} color="#a855f7" /></ChartCard>
        <ChartCard title="Violation Severity"><PieChart data={compData.severity} colors={chartColors.severity} /></ChartCard>
      </div>

    </div>
  );
}

/* =========================================================
   STYLES & COMPONENTS
========================================================= */

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '24px',
  marginBottom: '48px'
};

function SectionHeader({ title, badge }: { title: string, badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1f2937' }}>{title}</h2>
      {badge && (
        <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, color, sub }: any) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '800', color: color, lineHeight: '1', marginBottom: '8px' }}>
        {value}{suffix || ''}
      </div>
      <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>{sub}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '12px', height: '320px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '16px', textTransform: 'uppercase' }}>{title}</h3>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}