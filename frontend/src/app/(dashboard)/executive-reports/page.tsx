'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiGetBlob, safeNumber } from '@/lib/api-client';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';

/* =========================================================
   TYPES & INTERFACES (Enterprise Domain)
========================================================= */

type Model = {
    id: number;
    model_id: string;
    name: string;
    version?: string;
    description?: string;
};

type Audit = {
    audit_id: string;
    audit_result: string;
    executed_at: string;
    created_at?: string;
};

type MetricScore = {
    metric: string;
    L: number; // Likelihood (0-1)
    I: number; // Impact (0-1)
    R: number; // Regulatory (0-1)
    S: number; // Severity (Calculated)
    score_100: number; // 0-100 Score
    band: string; // LOW, MEDIUM, HIGH, CRITICAL
    w: number; // Weight
    frameworks?: Record<string, number>;
    signals?: Record<string, any>;
    alpha?: number;
    beta?: number;
};

type EvidenceSample = {
    prompt_id?: string;
    interaction_id?: string;
    latency_ms?: number;
    created_at?: string;
    prompt?: string;
    response?: string;
    // Metadata for tracing
    model_version?: string;
    temperature?: number;
};

type RemediationPlan = {
    priority?: 'P0' | 'P1' | 'P2' | 'P3';
    recommended_owner?: string;
    fix_steps?: string[];
    estimated_effort?: string;
};

type ExplanationContext = {
    title?: string;
    simple_definition?: string;
    why_it_matters?: string;
    business_impact?: string[];
    regulatory_impact?: string[];
};

type GroupedFinding = {
    issue_id: string;
    category: string;
    severity: string; // CRITICAL, HIGH, MEDIUM, LOW
    metric_name: string;
    description: string;
    occurrences: number;
    
    // Rich Context
    explain?: ExplanationContext | null;
    remediation?: RemediationPlan | null;
    
    // Attached Evidence (Specific to this finding)
    evidence_samples?: EvidenceSample[];
};

type GlobalRiskProfile = {
    score_100?: number;
    band?: string;
    percentile?: number; // Optional benchmarking
    trend?: 'IMPROVING' | 'WORSENING' | 'STABLE';
};

type FindingsGroupedReport = {
    audit: {
        audit_id?: string;
        model_frontend_id?: string;
        model_name?: string;
        audit_type?: string;
        executed_at?: string;
        execution_status?: string;
        audit_result?: string;
    };
    summary: {
        total_findings_raw: number;
        total_interactions: number;
        by_severity: Record<string, number>;
        by_category: Record<string, number>;
    };
    executive_summary: string[];
    unique_issue_count: number;

    global_risk?: GlobalRiskProfile;

    metric_scores?: MetricScore[];

    grouped_findings: GroupedFinding[];

    // Global evidence pool (optional fallback)
    evidence_samples?: EvidenceSample[];
};

/* =========================================================
   CONSTANTS & CONFIG
========================================================= */

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const RISK_CATEGORIES = ['BIAS', 'PII', 'SECURITY', 'HALLUCINATION', 'DRIFT']; // Expandable

/* =========================================================
   MAIN PAGE COMPONENT
========================================================= */

export default function ExecutiveReportsPage() {
    const router = useRouter();

    // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------

    // Data State
    const [models, setModels] = useState<Model[]>([]);
    const [audits, setAudits] = useState<Audit[]>([]);
    const [report, setReport] = useState<FindingsGroupedReport | null>(null);

    // Selection State
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [selectedAuditId, setSelectedAuditId] = useState<string>('');

    // Filter State
    const [severityFilter, setSeverityFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

    // UI Loading State
    const [loadingModels, setLoadingModels] = useState(true);
    const [loadingAudits, setLoadingAudits] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // -------------------------------------------------------------------------
    // DATA FETCHING LAYERS
    // -------------------------------------------------------------------------

    /**
     * Load available models on mount
     */
    async function fetchModels() {
        try {
            setLoadingModels(true);
            setError(null);
            const data = await apiGet<Model[]>('/models');
            setModels(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setModels([]);
            setError(e?.message || 'Failed to load models. Backend may be offline.');
        } finally {
            setLoadingModels(false);
        }
    }

    /**
     * Load recent audits when a model is selected
     */
    async function fetchAudits(modelId: string) {
        if (!modelId) {
            setAudits([]);
            setSelectedAuditId('');
            return;
        }
        try {
            setLoadingAudits(true);
            setError(null);
            const data = await apiGet<any[]>(`/audits/model/${modelId}/recent`);
            const list = Array.isArray(data) ? data : [];
            setAudits(list);
            
            // Auto-select latest audit for UX convenience
            if (list.length > 0) {
                setSelectedAuditId(list[0].audit_id);
            } else {
                setSelectedAuditId('');
            }
        } catch (e: any) {
            setAudits([]);
            setSelectedAuditId('');
            setError(e?.message || 'Failed to load audit history.');
        } finally {
            setLoadingAudits(false);
        }
    }

    /**
     * Load the heavy executive report payload
     */
    async function fetchReport(auditId: string) {
        if (!auditId) {
            setReport(null);
            return;
        }
        try {
            setLoadingReport(true);
            setError(null);
            // Using the grouped findings endpoint for executive summary view
            const data = (await apiGet(`/audits/${auditId}/findings-grouped`)) as FindingsGroupedReport;
            setReport(data || null);
        } catch (e: any) {
            setReport(null);
            setError(e?.message || 'Failed to generate executive report.');
        } finally {
            setLoadingReport(false);
        }
    }

    // -------------------------------------------------------------------------
    // EFFECTS
    // -------------------------------------------------------------------------

    useEffect(() => {
        fetchModels();
    }, []);

    useEffect(() => {
        if (selectedModel) fetchAudits(selectedModel);
        else {
            setAudits([]);
            setSelectedAuditId('');
            setReport(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedModel]);

    useEffect(() => {
        if (selectedAuditId) {
            fetchReport(selectedAuditId);
            // Reset filters when switching reports
            setSeverityFilter('ALL');
            setCategoryFilter('ALL');
        }
        else setReport(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAuditId]);

    // -------------------------------------------------------------------------
    // ACTIONS & HANDLERS
    // -------------------------------------------------------------------------

    async function downloadJson(auditId: string) {
        try {
            const blob = await apiGetBlob(`/audits/${auditId}/download`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_${auditId}_full_evidence.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            alert(e?.message || 'Failed to download JSON');
        }
    }

    async function downloadPdf(auditId: string) {
        try {
            const blob = await apiGetBlob(`/audits/${auditId}/download-pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_${auditId}_executive_report.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            alert(e?.message || 'Failed to download PDF');
        }
    }

    // -------------------------------------------------------------------------
    // COMPUTED DERIVATIONS (MEMOIZED)
    // -------------------------------------------------------------------------

    const metricScores = useMemo(() => {
        const list = report?.metric_scores ?? [];
        return Array.isArray(list) ? list : [];
    }, [report]);

    const globalRisk = useMemo(() => report?.global_risk ?? {}, [report]);

    const allFindings = useMemo(() => {
        const list = report?.grouped_findings ?? [];
        return Array.isArray(list) ? list : [];
    }, [report]);

    // Apply Filters (Severity + Category)
    const displayedFindings = useMemo(() => {
        let list = allFindings;

        // 1. Severity Filter
        if (severityFilter !== 'ALL') {
            list = list.filter(f => (f.severity || '').toUpperCase() === severityFilter);
        }

        // 2. Category Filter (Optional expansion)
        if (categoryFilter !== 'ALL') {
            list = list.filter(f => (f.category || '').toUpperCase().includes(categoryFilter));
        }

        return list;
    }, [allFindings, severityFilter, categoryFilter]);

    const countsBySeverity = useMemo(() => {
        const m: Record<string, number> = {};
        for (const s of SEVERITY_ORDER) m[s] = 0;
        for (const f of allFindings) {
            const sev = (f.severity || '').toUpperCase();
            if (m[sev] !== undefined) m[sev] += 1;
        }
        return m;
    }, [allFindings]);

    const countsByCategory = useMemo(() => {
        const m: Record<string, number> = {};
        for (const f of allFindings) {
            const cat = (f.category || 'UNKNOWN').toUpperCase();
            m[cat] = (m[cat] || 0) + 1;
        }
        return m;
    }, [allFindings]);

    const topRiskMetric = useMemo(() => {
        if (!metricScores.length) return null;
        // Sort by Score descending
        const sorted = [...metricScores].sort((a, b) => (b.score_100 ?? 0) - (a.score_100 ?? 0));
        return sorted[0];
    }, [metricScores]);

    /* =========================================================
       RENDER: MAIN UI
    ========================================================= */

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
            {/* 1. TOP HEADER & NAVIGATION */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 8, letterSpacing: '-0.5px' }}>
                    Executive Audit Report
                </h1>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, maxWidth: '800px' }}>
                    A comprehensive risk assessment report analyzing model behavior, regulatory compliance, 
                    and operational safety using the <b>L</b> (Likelihood), <b>I</b> (Impact), <b>R</b> (Regulatory) framework.
                </p>
            </div>

            {/* 2. REPORT CONTROLS (SELECTION PANEL) */}
            <div style={panel}>
                <div style={panelTitle}>Audit Configuration</div>

                <div style={grid2}>
                    {/* Model Selector */}
                    <div>
                        <label style={label}>Target Model</label>
                        <select
                            style={input}
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={loadingModels}
                        >
                            <option value="">
                                {loadingModels ? 'Loading inventory...' : 'Select a model from inventory'}
                            </option>
                            {models.map((m) => (
                                <option key={m.id} value={m.model_id}>
                                    {m.name} ({m.model_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Audit Selector */}
                    <div>
                        <label style={label}>Audit Run Snapshot</label>
                        <select
                            style={input}
                            value={selectedAuditId}
                            onChange={(e) => setSelectedAuditId(e.target.value)}
                            disabled={!selectedModel || loadingAudits}
                        >
                            <option value="">
                                {!selectedModel
                                    ? 'Select a model first'
                                    : loadingAudits
                                      ? 'Loading audit history...'
                                      : 'Select an audit run'}
                            </option>

                            {audits.map((a) => (
                                <option key={a.audit_id} value={a.audit_id}>
                                    {a.executed_at ? new Date(a.executed_at).toLocaleString() : 'Unknown Date'} — {a.audit_id}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Control Buttons */}
                <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button style={btnOutline} onClick={() => router.push('/reports')}>
                        ← Back to History
                    </button>

                    <div style={{ flex: 1 }} /> {/* Spacer */}

                    <button
                        style={selectedAuditId ? btnOutline : btnDisabled}
                        disabled={!selectedAuditId}
                        onClick={() => downloadJson(selectedAuditId)}
                    >
                        <span>Download Evidence (JSON)</span>
                    </button>

                    <button
                        style={selectedAuditId ? btnPrimary : btnDisabledPrimary}
                        disabled={!selectedAuditId}
                        onClick={() => downloadPdf(selectedAuditId)}
                    >
                        <span>Download Executive PDF</span>
                    </button>
                </div>
            </div>

            {/* 3. ERROR & LOADING STATES */}
            {error && (
                <div style={boxError}>
                    <div style={{ marginBottom: 4 }}>System Error</div>
                    <div style={{ fontWeight: 400 }}>{error}</div>
                </div>
            )}

            {loadingReport ? (
                <div style={boxMuted}>
                    <div style={{ marginBottom: 8, fontWeight: 700 }}>Generating Report...</div>
                    <div>Aggregating risk metrics, calculating impact scores, and grouping evidence.</div>
                </div>
            ) : !report ? (
                <div style={boxMuted}>
                    <div style={{ marginBottom: 8, fontWeight: 700 }}>No Report Loaded</div>
                    <div>Please select a model and an audit run from the controls above to view the executive summary.</div>
                </div>
            ) : (
                /* 4. MAIN REPORT CONTENT */
                <>
                    {/* SECTION: Global Risk Posture */}
                    <div style={{ marginTop: 28 }}>
                        <div style={sectionHeader}>
                            Global Risk Posture
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                                Aggregate risk score derived from all test vectors (Bias, Security, Drift).
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            <MetricCard 
                                label="Global Risk Score" 
                                value={globalRisk?.score_100 ?? '-'} 
                                description="/ 100"
                            />
                            
                            <MetricCard 
                                label="Risk Band" 
                                value={globalRisk?.band ?? 'UNKNOWN'} 
                                color={bandColor(globalRisk?.band || 'LOW')}
                                description="Executive Status"
                            />

                            <MetricCard 
                                label="Unique Issues" 
                                value={report.unique_issue_count} 
                                description="Grouped Findings"
                            />

                            <MetricCard 
                                label="Total Signals" 
                                value={report.summary?.total_findings_raw ?? 0} 
                                description="Raw Failures"
                            />
                        </div>

                        {topRiskMetric && (
                            <div style={alertBox}>
                                <b>Primary Risk Driver:</b> The {topRiskMetric.metric.toUpperCase()} metric is contributing most to the risk score 
                                (Score: <b>{topRiskMetric.score_100}</b> / Band: <b>{topRiskMetric.band}</b>).
                            </div>
                        )}
                    </div>

                    {/* SECTION: Findings Breakdown */}
                    <div style={{ marginTop: 32 }}>
                        <div style={sectionHeader}>Findings Statistics</div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {SEVERITY_ORDER.map((s) => (
                                <SeverityStatsCard 
                                    key={s} 
                                    severity={s} 
                                    count={countsBySeverity[s] || 0} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* SECTION: Risk Areas / Categories */}
                    <div style={{ marginTop: 32 }}>
                        <div style={sectionHeader}>Risk Category Distribution</div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                            {Object.entries(countsByCategory).length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', ...boxMuted }}>No risk categories detected.</div>
                            ) : (
                                Object.entries(countsByCategory).map(([cat, count]) => (
                                    <div key={cat} style={miniMetricCard}>
                                        <div style={metricLabel}>{cat}</div>
                                        <div style={metricValueSmall}>{count} Issues</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* SECTION: Enterprise Metric Scoring */}
                    <div style={{ marginTop: 32 }}>
                        <div style={sectionHeader}>
                            Enterprise Metric Scoring (L / I / R)
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                                Breakdown of Likelihood (L), Impact (I), and Regulatory (R) components per metric.
                            </div>
                        </div>

                        {metricScores.length === 0 ? (
                            <div style={boxMuted}>No metric scores available. Run an audit again and ensure metric scoring is stored.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {metricScores.map((m) => (
                                    <ScoreCard key={m.metric} metric={m} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECTION: Detailed Findings (Interactive) */}
                    <div style={{ marginTop: 40 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #e5e7eb', paddingBottom: 12, marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Detailed Findings</div>
                                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                                    Deduplicated issues with remediation guidance and evidence.
                                </div>
                            </div>
                            
                            {/* FILTER BAR */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <FilterButton 
                                    label="ALL" 
                                    count={allFindings.length} 
                                    active={severityFilter === 'ALL'} 
                                    onClick={() => setSeverityFilter('ALL')} 
                                    color="NEUTRAL"
                                />
                                {SEVERITY_ORDER.map(sev => (
                                    <FilterButton
                                        key={sev}
                                        label={sev}
                                        count={countsBySeverity[sev] || 0}
                                        active={severityFilter === sev}
                                        onClick={() => setSeverityFilter(sev)}
                                        color={sev}
                                    />
                                ))}
                            </div>
                        </div>

                        {displayedFindings.length === 0 ? (
                            <div style={{ ...boxMuted, textAlign: 'center', padding: 48 }}>
                                {severityFilter === 'ALL' 
                                    ? 'No findings detected in this audit. The model passed all checks.' 
                                    : `No ${severityFilter} findings detected.`}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {displayedFindings.map((f) => (
                                    <FindingCard key={f.issue_id} finding={f} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECTION: Global Evidence Samples */}
                    <div style={{ marginTop: 40, marginBottom: 60 }}>
                        <div style={sectionHeader}>
                            Global Evidence Samples
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                                A random subset of prompt/response interactions stored for this audit.
                            </div>
                        </div>

                        {(report.evidence_samples || []).length === 0 ? (
                            <div style={boxMuted}>No global evidence samples available for this audit.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {(report.evidence_samples || []).slice(0, 3).map((e, idx) => (
                                    <EvidenceCard key={idx} evidence={e} index={idx} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* =========================================================
   SUB-COMPONENTS (Reusable & Modular)
========================================================= */

function MetricCard({ label, value, color = '#111827', description }: any) {
    return (
        <div style={metricCardStyle}>
            <div style={metricLabel}>{label}</div>
            <div style={{ ...metricValue, color }}>{value}</div>
            {description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{description}</div>}
        </div>
    );
}

function SeverityStatsCard({ severity, count }: { severity: string, count: number }) {
    const style = severityCardStyle(severity);
    return (
        <div style={style}>
            <div style={metricLabel}>{severity}</div>
            <div style={metricValue}>{count}</div>
        </div>
    );
}

function ScoreCard({ metric }: { metric: MetricScore }) {
    return (
        <div style={scoreCardStyle}>
            <div style={scoreTopRow}>
                <div style={{ minWidth: 0 }}>
                    <div style={scoreTitle}>{metric.metric.toUpperCase()}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={chipNeutral}>
                            Score: <b>{(metric.score_100 ?? 0).toFixed(2)}</b> / 100
                        </span>
                        <span style={chipBand(metric.band)}>{metric.band}</span>
                        <span style={chipNeutral}>α={metric.alpha ?? 1}</span>
                        <span style={chipNeutral}>β={metric.beta ?? 1.5}</span>
                    </div>
                </div>

                <div style={scoreRightBox}>
                    <div style={scoreRightItem}>
                        <div style={rightMetaLabel}>L (Likelihood)</div>
                        <div style={rightMetaValue}>{(metric.L ?? 0).toFixed(2)}</div>
                    </div>
                    <div style={scoreRightItem}>
                        <div style={rightMetaLabel}>I (Impact)</div>
                        <div style={rightMetaValue}>{(metric.I ?? 0).toFixed(2)}</div>
                    </div>
                    <div style={scoreRightItem}>
                        <div style={rightMetaLabel}>R (Regulatory)</div>
                        <div style={rightMetaValue}>{(metric.R ?? 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Frameworks Section */}
            <div style={{ marginTop: 12, ...boxSoft }}>
                <div style={blockTitle}>Regulatory Frameworks</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(metric.frameworks || {}).map(([k, v]) => (
                        <span key={k} style={chipNeutral}>
                            {k}: <b>{Number(v).toFixed(2)}</b>
                        </span>
                    ))}
                    {Object.keys(metric.frameworks || {}).length === 0 && (
                        <div style={blockText}>No specific regulatory frameworks triggered for this metric.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FindingCard({ finding }: { finding: GroupedFinding }) {
    const [expanded, setExpanded] = useState(false);
    
    // Attempt to get specific evidence for this finding
    const evidence = finding.evidence_samples?.[0];

    return (
        <div style={findingCardStyle}>
            {/* Header Row */}
            <div style={findingTopRow}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={findingId}>
                        {finding.metric_name}
                    </div>

                    <div style={chipRow}>
                        <span style={chipSeverity(finding.severity)}>
                            {(finding.severity || '').toUpperCase()}
                        </span>
                        <span style={chipNeutral}>{(finding.category || '').toUpperCase()}</span>
                        <span style={chipNeutral}>{finding.occurrences} Occurrences</span>
                    </div>
                </div>

                <div style={rightMetaBox}>
                    <div style={rightMetaItem}>
                        <div style={rightMetaLabel}>Owner</div>
                        <div style={rightMetaValue}>
                            {finding.remediation?.recommended_owner || 'Engineering'}
                        </div>
                    </div>
                    <div style={rightMetaItem}>
                        <div style={rightMetaLabel}>Priority</div>
                        <div style={rightMetaValue}>
                            {finding.remediation?.priority || 'STANDARD'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description Block */}
            <div style={block}>
                <div style={blockTitle}>Issue Description</div>
                <div style={blockText}>{finding.description}</div>
            </div>

            {/* Context Blocks */}
            <div style={grid2Tight}>
                <div style={block}>
                    <div style={blockTitle}>Definition</div>
                    <div style={blockText}>
                        {finding.explain?.simple_definition || 'Not available.'}
                    </div>
                </div>

                <div style={block}>
                    <div style={blockTitle}>Business Impact</div>
                    <div style={blockText}>
                        {finding.explain?.why_it_matters || 'Not available.'}
                    </div>
                </div>
            </div>

            {/* Remediation */}
            <div style={block}>
                <div style={blockTitle}>Remediation Steps</div>
                {(finding.remediation?.fix_steps || []).length === 0 ? (
                    <div style={blockText}>No specific steps available.</div>
                ) : (
                    <ol style={stepsList}>
                        {finding.remediation?.fix_steps?.slice(0, 5).map((s, i) => (
                            <li key={i} style={stepItem}>{s}</li>
                        ))}
                    </ol>
                )}
            </div>

            {/* ✅ EVIDENCE TOGGLE */}
            {evidence && (
                <div style={{ marginTop: 16 }}>
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        style={btnToggle}
                    >
                        {expanded ? '▼ Hide Evidence Snapshot' : '▶ Show Evidence Snapshot (Prompt/Response)'}
                    </button>

                    {expanded && (
                        <div style={evidenceBox}>
                            <div style={{ marginBottom: 12 }}>
                                <div style={evidenceLabel}>Prompt ({evidence.prompt_id || 'N/A'})</div>
                                <pre style={codeBox}>{evidence.prompt || '(No prompt data)'}</pre>
                            </div>
                            <div>
                                <div style={evidenceLabel}>Model Response (Latency: {evidence.latency_ms ?? '-'}ms)</div>
                                <pre style={codeBox}>{evidence.response || '(No response data)'}</pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function FilterButton({ label, count, active, onClick, color }: any) {
    let bg = '#ffffff';
    let text = '#4b5563';
    let border = '#e5e7eb';

    if (active) {
        text = '#ffffff';
        if (color === 'CRITICAL') { bg = '#991b1b'; border = '#991b1b'; }
        else if (color === 'HIGH') { bg = '#ea580c'; border = '#ea580c'; }
        else if (color === 'MEDIUM') { bg = '#d97706'; border = '#d97706'; }
        else if (color === 'LOW') { bg = '#16a34a'; border = '#16a34a'; }
        else { bg = '#111827'; border = '#111827'; } // ALL or NEUTRAL
    } else {
        // Inactive Hover State Logic could go here
    }

    return (
        <button 
            onClick={onClick} 
            style={{ 
                padding: '6px 12px', 
                fontSize: 11, 
                fontWeight: 700, 
                border: `2px solid ${border}`, 
                background: bg, 
                color: text, 
                cursor: 'pointer', 
                borderRadius: 4, 
                display: 'flex', 
                gap: 6, 
                alignItems: 'center',
                transition: 'all 0.15s ease'
            }}
        >
            {label} 
            <span style={{ opacity: active ? 1 : 0.6, fontSize: 10 }}>({count})</span>
        </button>
    );
}

function EvidenceCard({ evidence, index }: { evidence: EvidenceSample, index: number }) {
    return (
        <div style={evidenceCardStyle}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>Evidence #{index + 1}</span>
                <span>Prompt ID: <span style={{ fontFamily: 'monospace' }}>{evidence.prompt_id}</span></span>
                <span>Latency: <b>{evidence.latency_ms}</b> ms</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <div style={blockTitle}>Prompt</div>
                    <pre style={codeBoxHeight}>{evidence.prompt}</pre>
                </div>

                <div>
                    <div style={blockTitle}>Response</div>
                    <pre style={codeBoxHeight}>{evidence.response}</pre>
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   STYLES (Inline Constants - Matching existing system)
========================================================= */

const panel = {
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    padding: 20,
} as const;

const panelTitle = {
    fontSize: 14,
    fontWeight: 900,
    color: '#111827',
    marginBottom: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
} as const;

const sectionHeader = {
    fontSize: 18,
    fontWeight: 900,
    color: '#111827',
    marginBottom: 12,
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: 10,
} as const;

const label = {
    fontSize: 11,
    fontWeight: 800,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
    display: 'block',
} as const;

const input = {
    width: '100%',
    padding: 12,
    border: '2px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    borderRadius: 0,
    cursor: 'pointer',
} as const;

const grid2 = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
} as const;

const grid2Tight = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 12,
} as const;

const btnOutline = {
    border: '2px solid #e5e7eb',
    background: '#ffffff',
    color: '#111827',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
} as const;

const btnPrimary = {
    border: '2px solid #111827',
    background: '#111827',
    color: '#ffffff',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
} as const;

const btnDisabled = {
    border: '2px solid #e5e7eb',
    background: '#f9fafb',
    color: '#9ca3af',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'not-allowed',
} as const;

const btnDisabledPrimary = {
    border: '2px solid #e5e7eb',
    background: '#f3f4f6',
    color: '#9ca3af',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'not-allowed',
} as const;

const btnToggle = {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
} as const;

const boxMuted = {
    border: '2px solid #e5e7eb',
    padding: 24,
    color: '#6b7280',
    fontSize: 14,
    marginTop: 14,
    background: '#f9fafb',
} as const;

const boxSoft = {
    border: '2px solid #e5e7eb',
    padding: 14,
    background: '#ffffff',
} as const;

const boxError = {
    border: '2px solid #fecaca',
    background: '#fef2f2',
    padding: 20,
    color: '#991b1b',
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: 'pre-wrap' as const,
    marginTop: 24,
} as const;

const alertBox = {
    marginTop: 12,
    border: '2px solid #e5e7eb',
    padding: 14,
    fontSize: 13,
    color: '#111827',
    background: '#f9fafb',
    lineHeight: 1.5,
} as const;

const metricCardStyle = {
    border: '2px solid #e5e7eb',
    padding: 16,
    background: '#fff',
} as const;

const metricLabel = {
    fontSize: 11,
    fontWeight: 800,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 8,
} as const;

const metricValue = {
    fontSize: 32,
    fontWeight: 900,
    color: '#111827',
    lineHeight: 1,
} as const;

const metricValueSmall = {
    fontSize: 20,
    fontWeight: 900,
    color: '#111827',
} as const;

const miniMetricCard = {
    border: '2px solid #e5e7eb',
    padding: 12,
    background: '#fff',
} as const;

const severityCardStyle = (sev: string) => {
    const s = sev.toUpperCase();
    let border = '#e5e7eb';
    let bg = '#ffffff';

    if (s === 'CRITICAL') {
        border = '#fecaca';
        bg = '#fef2f2';
    } else if (s === 'HIGH') {
        border = '#fed7aa';
        bg = '#fff7ed';
    } else if (s === 'MEDIUM') {
        border = '#fde68a';
        bg = '#fffbeb';
    } else if (s === 'LOW') {
        border = '#bbf7d0';
        bg = '#f0fdf4';
    }

    return {
        border: `2px solid ${border}`,
        background: bg,
        padding: 16,
    } as const;
};

function bandColor(band: string) {
    const b = (band || '').toUpperCase();
    if (b === 'CRITICAL') return '#991b1b';
    if (b === 'SEVERE') return '#9a3412';
    if (b === 'HIGH') return '#9a3412';
    if (b === 'MODERATE') return '#92400e';
    return '#166534';
}

const chipNeutral = {
    display: 'inline-block',
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    fontSize: 11,
    fontWeight: 700,
    color: '#374151',
    borderRadius: 4,
} as const;

const chipBand = (band: string) => {
    return {
        display: 'inline-block',
        padding: '4px 8px',
        border: `1px solid ${bandColor(band)}`,
        background: '#ffffff',
        fontSize: 11,
        fontWeight: 800,
        color: bandColor(band),
        borderRadius: 4,
    } as const;
};

const scoreCardStyle = {
    border: '2px solid #e5e7eb',
    padding: 20,
    background: '#ffffff',
} as const;

const scoreTopRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap' as const,
} as const;

const scoreTitle = {
    fontSize: 16,
    fontWeight: 900,
    color: '#111827',
    marginBottom: 8,
} as const;

const scoreRightBox = {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
} as const;

const scoreRightItem = {
    border: '1px solid #e5e7eb',
    padding: '8px 12px',
    minWidth: 100,
    background: '#f9fafb',
    textAlign: 'center' as const,
} as const;

const rightMetaLabel = {
    fontSize: 10,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
} as const;

const rightMetaValue = {
    fontSize: 14,
    fontWeight: 800,
    color: '#111827',
} as const;

const findingCardStyle = {
    border: '2px solid #e5e7eb',
    padding: 20,
    background: '#ffffff',
    transition: 'border-color 0.2s',
} as const;

const findingTopRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap' as const,
} as const;

const findingId = {
    fontSize: 15,
    fontWeight: 800,
    color: '#111827',
    wordBreak: 'break-word' as const,
    marginBottom: 8,
} as const;

const chipRow = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    alignItems: 'center',
} as const;

const chipSeverity = (sev: string) => {
    const s = (sev || '').toUpperCase();
    let bg = '#e5e7eb';
    let border = '#e5e7eb';
    let color = '#111827';

    if (s === 'CRITICAL') {
        bg = '#fee2e2';
        border = '#fecaca';
        color = '#991b1b';
    } else if (s === 'HIGH') {
        bg = '#ffedd5';
        border = '#fed7aa';
        color = '#9a3412';
    } else if (s === 'MEDIUM') {
        bg = '#fef3c7';
        border = '#fde68a';
        color = '#92400e';
    } else if (s === 'LOW') {
        bg = '#dcfce7';
        border = '#bbf7d0';
        color = '#166534';
    }

    return {
        display: 'inline-block',
        padding: '4px 8px',
        border: `1px solid ${border}`,
        background: bg,
        fontSize: 11,
        fontWeight: 800,
        color,
        borderRadius: 4,
    } as const;
};

const rightMetaBox = {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
} as const;

const rightMetaItem = {
    border: '1px solid #e5e7eb',
    padding: '6px 12px',
    minWidth: 120,
    background: '#ffffff',
} as const;

const block = {
    border: '1px solid #e5e7eb',
    padding: 14,
    background: '#ffffff',
    marginTop: 14,
} as const;

const blockTitle = {
    fontSize: 11,
    fontWeight: 800,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 8,
} as const;

const blockText = {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
} as const;

const stepsList = {
    margin: 0,
    paddingLeft: 18,
} as const;

const stepItem = {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#111827',
    marginBottom: 6,
} as const;

const evidenceBox = {
    marginTop: 12,
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    padding: 16,
} as const;

const evidenceLabel = {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    marginBottom: 6,
} as const;

const codeBox = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    padding: 12,
    whiteSpace: 'pre-wrap' as const,
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: 'monospace',
    color: '#334155',
    margin: 0,
} as const;

const evidenceCardStyle = {
    border: '2px solid #e5e7eb',
    padding: 16,
    background: '#ffffff',
} as const;

const codeBoxHeight = {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    padding: 12,
    whiteSpace: 'pre-wrap' as const,
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: 'monospace',
    color: '#374151',
    margin: 0,
    height: 120,
    overflowY: 'auto' as const,
} as const;