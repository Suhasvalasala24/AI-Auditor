'use client';

import { useEffect, useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';

import { apiGet } from '@/lib/api-client';

type IncidentRow = {
  id: string;
  severity: string;
  incidentType: string;
  model: string;
  model_id?: string;
  date: string | null;
  ruleViolated: string;
  description?: string;
  audit_id?: string;
};

type IncidentsResponse = {
  status: 'OK' | 'ERROR';
  count: number;
  incidents: IncidentRow[];
};

export default function IncidentsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string>('All');

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch incidents from backend (LIVE)
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiGet<IncidentsResponse>('/incidents?limit=300');

        if (!mounted) return;

        setIncidents(Array.isArray(res?.incidents) ? res.incidents : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load incidents');
        setIncidents([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ unique models for dropdown (LIVE)
  const uniqueModels = useMemo(() => {
    const models = Array.from(new Set(incidents.map((i) => i.model).filter(Boolean)));
    return ['All', ...models];
  }, [incidents]);

  // ✅ filter
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSeverity =
        severityFilter === 'All' ||
        (incident.severity || '').toUpperCase() === severityFilter.toUpperCase();

      const matchesModel = modelFilter === 'All' || incident.model === modelFilter;

      return matchesSeverity && matchesModel;
    });
  }, [incidents, severityFilter, modelFilter]);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Incidents</h1>
        <p className="text-sm text-gray-600 mt-2">
          Live incidents are generated from real audit findings (HIGH / CRITICAL).
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="mb-6"
        style={{
          background: '#ffffff',
          padding: '20px 24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Severity Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Severity</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '8px 32px 8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: '#ffffff',
              cursor: 'pointer',
              minWidth: '140px',
            }}
          >
            <option value="All">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Model Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Model</span>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            style={{
              padding: '8px 32px 8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: '#ffffff',
              cursor: 'pointer',
              minWidth: '180px',
            }}
          >
            {uniqueModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {/* Simple status */}
        <div className="text-sm text-gray-500">
          {loading ? 'Loading…' : `Loaded ${incidents.length} incidents`}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6"
          style={{
            background: '#fff',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 16,
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {/* Incidents Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 180px 180px 1.5fr',
            gap: '16px',
            padding: '16px 24px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div className="text-sm font-semibold text-gray-700">Severity</div>
          <div className="text-sm font-semibold text-gray-700">Incident Type</div>
          <div className="text-sm font-semibold text-gray-700">Model</div>
          <div className="text-sm font-semibold text-gray-700">Date</div>
          <div className="text-sm font-semibold text-gray-700">Rule / Metric</div>
        </div>

        {/* Table Body */}
        <div>
          {loading ? (
            <div style={{ padding: '40px 24px', color: '#6b7280' }}>Loading incidents…</div>
          ) : filteredIncidents.length === 0 ? (
            <div
              style={{
                padding: '60px 24px',
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              <div className="flex justify-center mb-3">
                <SearchX size={48} className="text-gray-400" />
              </div>
              <div className="text-lg font-medium text-gray-600">No incidents found</div>
              <div className="text-sm text-gray-500 mt-2">Run an audit to generate real incidents.</div>
            </div>
          ) : (
            filteredIncidents.map((incident, index) => (
              <div
                key={incident.id}
                className="transition-all duration-150"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 180px 180px 1.5fr',
                  gap: '16px',
                  padding: '16px 24px',
                  borderBottom: index < filteredIncidents.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                {/* Severity Badge */}
                <div>
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background:
                        incident.severity === 'CRITICAL'
                          ? '#dc2626'
                          : incident.severity === 'HIGH'
                          ? '#f97316'
                          : incident.severity === 'MEDIUM'
                          ? '#eab308'
                          : '#10b981',
                      color: 'white',
                    }}
                  >
                    {incident.severity}
                  </span>
                </div>

                {/* Incident Type */}
                <div className="text-sm text-gray-900">{incident.incidentType}</div>

                {/* Model */}
                <div className="text-sm text-gray-700">{incident.model}</div>

                {/* Date */}
                <div className="text-sm text-gray-700">
                  {incident.date ? new Date(incident.date).toLocaleString() : '—'}
                </div>

                {/* Rule Violated */}
                <div className="text-sm text-gray-700">{incident.ruleViolated}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Results Summary */}
      {!loading && filteredIncidents.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </div>
      )}
    </div>
  );
}
