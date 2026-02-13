'use client';

import React, { useMemo, useState } from 'react';
import { apiPost } from '@/lib/api-client';

/* =========================================================
   TYPES & HELPERS
========================================================= */

type TestConnectionResponse = {
  status: string;
  message: string;
  latency_ms?: number;
  extracted_response?: string;
  raw_preview?: string;
};

// Reusable Styles for consistency
const INPUT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};

const LABEL_STYLE = "block text-sm font-medium text-gray-700 mb-2";

export default function SettingsPage() {
  // -----------------------------
  // Model Integration State
  // -----------------------------
  const [modelEndpoint, setModelEndpoint] = useState('http://127.0.0.1:11434/api/generate');
  const [apiKey, setApiKey] = useState('');
  const [httpMethod, setHttpMethod] = useState<'POST' | 'GET'>('POST');
  
  // JSON Inputs
  const [headersJson, setHeadersJson] = useState<string>(
    JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)
  );
  const [requestTemplateJson, setRequestTemplateJson] = useState<string>(
    JSON.stringify({ model: 'llama3', prompt: '{{PROMPT}}', stream: false }, null, 2)
  );

  const [responsePath, setResponsePath] = useState('response');
  const [testPrompt, setTestPrompt] = useState('Say hello in one line.');

  // Testing State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latency_ms?: number;
    extracted_response?: string;
    raw_preview?: string;
  } | null>(null);

  // -----------------------------
  // Rule Configuration State
  // -----------------------------
  const [driftThreshold, setDriftThreshold] = useState(0.5);
  const [biasThreshold, setBiasThreshold] = useState(0.3);
  
  // Toggles
  const [driftRateRule, setDriftRateRule] = useState(true);
  const [biasThresholdRules, setBiasThresholdRules] = useState(false);
  const [biasNotationRules, setBiasNotationRules] = useState(true);
  const [formateConfigRule, setFormateConfigRule] = useState(true);
  const [burorRules, setBurorRules] = useState(true);

  const [savingRules, setSavingRules] = useState(false);

  // -----------------------------
  // Notification Settings State
  // -----------------------------
  const [email, setEmail] = useState('');
  const [webhook, setWebhook] = useState('');
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState(true);
  const [highFilter, setHighFilter] = useState(false);
  const [mediumFilter, setMediumFilter] = useState(false);
  const [lowFilter, setLowFilter] = useState(false);

  const [savingNotify, setSavingNotify] = useState(false);

  // -----------------------------
  // Computed Validation
  // -----------------------------
  const parsedHeaders = useMemo(() => {
    try {
      const parsed = JSON.parse(headersJson || '{}');
      return (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch { return null; }
  }, [headersJson]);

  const parsedTemplate = useMemo(() => {
    try {
      const parsed = JSON.parse(requestTemplateJson || '{}');
      return (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch { return null; }
  }, [requestTemplateJson]);

  // -----------------------------
  // Actions
  // -----------------------------

  const handleConnectionTest = async () => {
    setTestResult(null);

    // 1. Validation
    if (!parsedHeaders) {
      setTestResult({ ok: false, message: 'Invalid JSON in Headers.' });
      return;
    }
    if (!parsedTemplate) {
      setTestResult({ ok: false, message: 'Invalid JSON in Request Template.' });
      return;
    }
    if (!requestTemplateJson.includes('{{PROMPT}}')) {
      setTestResult({ ok: false, message: 'Template must contain {{PROMPT}} placeholder.' });
      return;
    }

    try {
      setTesting(true);

      // 2. Real API Call
      const payload = {
        endpoint: modelEndpoint,
        method: httpMethod,
        headers: {
          ...parsedHeaders,
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        request_template: parsedTemplate,
        response_path: responsePath,
        test_prompt: testPrompt,
        timeout_seconds: 20,
      };

      const data = await apiPost<TestConnectionResponse>('/connectors/test', payload);

      setTestResult({
        ok: true,
        message: data.message || 'Connection successful',
        latency_ms: data.latency_ms,
        extracted_response: data.extracted_response,
        raw_preview: data.raw_preview,
      });

    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Connection failed. Check console for details.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));
    setSavingRules(false);
    alert("Rule configuration saved successfully.");
  };

  const handleSaveNotifications = async () => {
    setSavingNotify(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));
    setSavingNotify(false);
    alert("Notification preferences saved successfully.");
  };

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings Page</h1>
      </div>

      {/* Settings Grid - 3 Columns */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* =========================================
            COLUMN 1: MODEL INTEGRATIONS
           ========================================= */}
        <SettingsCard title="Model Integrations">
          <div className="space-y-5">
            {/* Model Endpoint */}
            <div>
              <label className={LABEL_STYLE}>Model Endpoint URL</label>
              <input
                type="text"
                value={modelEndpoint}
                onChange={(e) => setModelEndpoint(e.target.value)}
                className="w-full focus:border-blue-500"
                style={INPUT_STYLE}
              />
            </div>

            {/* HTTP Method */}
            <div>
              <label className={LABEL_STYLE}>HTTP Method</label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as any)}
                className="w-full focus:border-blue-500"
                style={{ ...INPUT_STYLE, background: '#fff' }}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className={LABEL_STYLE}>API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full focus:border-blue-500"
                style={INPUT_STYLE}
                placeholder="sk-..."
              />
              <div style={{ fontSize: 12, marginTop: 6, color: '#6b7280' }}>
                Optional. Sent as <code>Authorization: Bearer ...</code>
              </div>
            </div>

            {/* Headers JSON */}
            <div>
              <label className={LABEL_STYLE}>Headers (JSON)</label>
              <textarea
                value={headersJson}
                onChange={(e) => setHeadersJson(e.target.value)}
                className="w-full focus:border-blue-500"
                rows={5}
                style={{ ...INPUT_STYLE, fontFamily: 'monospace' }}
              />
            </div>

            {/* Request Template */}
            <div>
              <label className={LABEL_STYLE}>Request Template (JSON)</label>
              <textarea
                value={requestTemplateJson}
                onChange={(e) => setRequestTemplateJson(e.target.value)}
                className="w-full focus:border-blue-500"
                rows={7}
                style={{ ...INPUT_STYLE, fontFamily: 'monospace' }}
              />
              <div style={{ fontSize: 12, marginTop: 6, color: '#6b7280' }}>
                Must contain: <code>{'{{PROMPT}}'}</code>
              </div>
            </div>

            {/* Response Path */}
            <div>
              <label className={LABEL_STYLE}>Response Path (Dot Notation)</label>
              <input
                type="text"
                value={responsePath}
                onChange={(e) => setResponsePath(e.target.value)}
                className="w-full focus:border-blue-500"
                style={INPUT_STYLE}
                placeholder="choices.0.message.content"
              />
            </div>

            {/* Test Prompt */}
            <div>
              <label className={LABEL_STYLE}>Test Prompt</label>
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="w-full focus:border-blue-500"
                style={INPUT_STYLE}
              />
            </div>

            {/* Test Button */}
            <button
              onClick={handleConnectionTest}
              disabled={testing}
              className="transition-all duration-200 hover:bg-blue-700"
              style={{
                background: testing ? '#93c5fd' : '#2563eb',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: testing ? 'not-allowed' : 'pointer',
                width: '100%',
                opacity: testing ? 0.85 : 1,
              }}
            >
              {testing ? 'Testing Connection...' : 'Test Connection'}
            </button>

            {/* Test Results */}
            {testResult && (
              <div
                style={{
                  border: `1px solid ${testResult.ok ? '#86efac' : '#fca5a5'}`,
                  background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                  borderRadius: 10,
                  padding: 14,
                  marginTop: 6,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: testResult.ok ? '#166534' : '#991b1b', marginBottom: 6 }}>
                  {testResult.ok ? '✅ Connection Successful' : '❌ Connection Failed'}
                </div>
                <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4 }}>{testResult.message}</div>
                {testResult.ok && (
                  <>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                      Latency: <b>{testResult.latency_ms} ms</b>
                    </div>
                    {testResult.extracted_response && (
                      <div className="mt-2 bg-white border border-gray-200 p-2 rounded text-xs font-mono text-gray-700">
                        {testResult.extracted_response}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </SettingsCard>

        {/* =========================================
            COLUMN 2: RULE CONFIGURATION
           ========================================= */}
        <SettingsCard title="Rule Configuration">
          <div className="space-y-6 flex-1">
            
            {/* Drift Threshold */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Drift Threshold</label>
                <span className="text-sm font-bold text-blue-600">{Math.round(driftThreshold * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={driftThreshold}
                onChange={(e) => setDriftThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span><span>0.5</span><span>1.0</span>
              </div>
            </div>

            {/* Bias Threshold */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Bias Threshold</label>
                <span className="text-sm font-bold text-blue-600">{Math.round(biasThreshold * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={biasThreshold}
                onChange={(e) => setBiasThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span><span>0.3</span><span>0.6</span><span>1.0</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <ToggleSwitch label="Drift Threshold Rate Rule" checked={driftRateRule} onChange={setDriftRateRule} />
              <ToggleSwitch label="Bias Threshold Rules" checked={biasThresholdRules} onChange={setBiasThresholdRules} />
              <ToggleSwitch label="Bias Threshold Notation" checked={biasNotationRules} onChange={setBiasNotationRules} />
              <ToggleSwitch label="Format Configuration" checked={formateConfigRule} onChange={setFormateConfigRule} />
              <ToggleSwitch label="Buror Avamoration Rules" checked={burorRules} onChange={setBurorRules} />
            </div>
          </div>

            {/* Save Button */}
            <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                    onClick={handleSaveRules}
                    disabled={savingRules}
                    className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-colors"
                    style={{ background: savingRules ? '#93c5fd' : '#2563eb' }}
                >
                    {savingRules ? 'Saving Configuration...' : 'Save Configuration'}
                </button>
            </div>
        </SettingsCard>

        {/* =========================================
            COLUMN 3: NOTIFICATION SETTINGS
           ========================================= */}
        <SettingsCard title="Notification Settings">
          <div className="space-y-5 flex-1">
            
            {/* Email */}
            <div>
              <label className={LABEL_STYLE}>Email Alerts</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full focus:border-blue-500"
                style={INPUT_STYLE}
                placeholder="security@company.com"
              />
            </div>

            {/* Webhook */}
            <div>
              <label className={LABEL_STYLE}>Slack/Teams Webhook</label>
              <input
                type="text"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                className="w-full focus:border-blue-500"
                style={INPUT_STYLE}
                placeholder="https://hooks.slack.com/..."
              />
            </div>

            {/* Severity Filters */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-4">Severity Filters</label>
              <div className="space-y-3">
                <SeverityToggle label="Severity (Global)" color="#8b5cf6" checked={severityFilter} onChange={setSeverityFilter} />
                <SeverityToggle label="High Risk" color="#ef4444" checked={highFilter} onChange={setHighFilter} />
                <SeverityToggle label="Medium Risk" color="#f59e0b" checked={mediumFilter} onChange={setMediumFilter} />
                <SeverityToggle label="Low Risk" color="#10b981" checked={lowFilter} onChange={setLowFilter} />
              </div>
            </div>
          </div>

            {/* Save Button */}
            <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                    onClick={handleSaveNotifications}
                    disabled={savingNotify}
                    className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-colors"
                    style={{ background: savingNotify ? '#93c5fd' : '#2563eb' }}
                >
                    {savingNotify ? 'Saving Preferences...' : 'Save Preferences'}
                </button>
            </div>
        </SettingsCard>

      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '14px',
      padding: '28px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4">{title}</h2>
      {children}
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between cursor-pointer group" onClick={() => onChange(!checked)}>
      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
      <div style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? '#3b82f6' : '#e5e7eb',
        position: 'relative', transition: 'background 0.2s'
      }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
          position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s'
        }} />
      </div>
    </div>
  );
}

function SeverityToggle({ label, color, checked, onChange }: { label: string; color: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between cursor-pointer group" onClick={() => onChange(!checked)}>
      <div className="flex items-center gap-2">
        <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color }} />
        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
      </div>
      <div style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? '#3b82f6' : '#e5e7eb',
        position: 'relative', transition: 'background 0.2s'
      }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
          position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s'
        }} />
      </div>
    </div>
  );
}