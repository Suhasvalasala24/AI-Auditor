'use client';

import React, { useState } from 'react';
import { apiPost } from '@/lib/api-client';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddModelModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        model_id: '',
        name: '',
        provider: 'openai',
        model: '',
        endpoint: '',
        api_key: '',
        temperature: 0.7,
    });

    async function submit() {
        if (!form.model_id || !form.name || !form.endpoint) {
            alert('Model ID, Name, and Endpoint are required');
            return;
        }

        setLoading(true);

        try {
            // -----------------------------
            // Build provider-agnostic request_template
            // -----------------------------
            const request_template: any = {
                temperature: form.temperature,
            };

            // Providers that require model + messages
            if (form.model) {
                request_template.model = form.model;
                request_template.messages = [{ role: 'user', content: '{{PROMPT}}' }];
            } else {
                // Generic / local fallback
                request_template.input = '{{PROMPT}}';
            }

            const payload = {
                model_id: form.model_id,
                name: form.name,
                endpoint: form.endpoint,
                method: 'POST',
                headers: form.api_key
                    ? {
                          Authorization: `Bearer ${form.api_key}`,
                          'Content-Type': 'application/json',
                      }
                    : {
                          'Content-Type': 'application/json',
                      },
                request_template,
                response_path: form.model ? 'choices[0].message.content' : 'output',
            };

            await apiPost('/models/register-with-connector', payload);

            onSuccess();
            onClose();
        } catch (e: any) {
            alert(`Registration failed:\n${e?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff',
                    padding: 28,
                    width: 540,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                }}
            >
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                    Add Custom Model
                </h2>

                <label>Model Nickname *</label>
                <input
                    style={input}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />

                <label>Model ID *</label>
                <input
                    style={input}
                    value={form.model_id}
                    onChange={(e) => setForm({ ...form, model_id: e.target.value })}
                />

                <label>Provider</label>
                <select
                    style={input}
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="local">Local / Self-hosted</option>
                    <option value="custom">Custom API</option>
                </select>

                <label>Model / Deployment Name (provider-specific)</label>
                <input
                    style={input}
                    placeholder="e.g. gpt-4o-mini, claude-3-opus"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                />

                <label>API Endpoint *</label>
                <input
                    style={input}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    value={form.endpoint}
                    onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                />

                <label>API Key (optional)</label>
                <input
                    type="password"
                    style={input}
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                />

                <label>Temperature</label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            temperature: Number(e.target.value),
                        })
                    }
                />

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                        marginTop: 24,
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 16px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={submit}
                        disabled={loading}
                        style={{
                            padding: '10px 16px',
                            background: '#4f46e5',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 600,
                        }}
                    >
                        {loading ? 'Adding…' : 'Add Model'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const input: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 14,
    border: '1px solid #d1d5db',
    fontSize: 14,
};
