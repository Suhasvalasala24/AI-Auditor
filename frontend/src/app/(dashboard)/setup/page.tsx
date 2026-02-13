"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant, createProject, createModel } from '@/lib/api-client';

export default function SetupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        tenantName: '',
        projectName: '',
        taskType: 'classification',
        modelName: '',
        modelVersion: 'v1.0'
    });

    const [ids, setIds] = useState({
        tenantId: '',
        projectId: '',
        modelId: ''
    });

    const handleNext = async () => {
        setError(null);
        setLoading(true);

        try {
            if (step === 1) {
                // Create tenant
                const tenant = await createTenant(formData.tenantName);
                setIds({ ...ids, tenantId: tenant.id });
                setStep(2);
            } else if (step === 2) {
                // Create project
                const project = await createProject({
                    tenant_id: ids.tenantId,
                    name: formData.projectName,
                    task_type: formData.taskType
                });
                setIds({ ...ids, projectId: project.id });
                setStep(3);
            } else if (step === 3) {
                // Create model
                const model = await createModel({
                    project_id: ids.projectId,
                    name: formData.modelName,
                    version: formData.modelVersion
                });
                setIds({ ...ids, modelId: model.id });
                setStep(4);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create resource');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        router.push('/drift');
    };

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh', padding: '24px' }}>
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Monitoring Project</h1>
                    <p className="text-gray-600">
                        Create your tenant, project, and model to start monitoring
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex-1 flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {s}
                                </div>
                                {s < 4 && (
                                    <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-600">Tenant</span>
                        <span className="text-xs text-gray-600">Project</span>
                        <span className="text-xs text-gray-600">Model</span>
                        <span className="text-xs text-gray-600">Complete</span>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 font-semibold">Error</p>
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Step 1: Create Tenant */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Step 1: Create Tenant</h2>
                            <p className="text-gray-600 mb-6">
                                A tenant represents your organization or team
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tenant Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.tenantName}
                                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Acme Corporation"
                                />
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!formData.tenantName || loading}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? 'Creating...' : 'Next: Create Project →'}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Create Project */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Step 2: Create Project</h2>
                            <p className="text-gray-600 mb-6">
                                Projects group models and define monitoring scope
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Fraud Detection"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Task Type *
                                </label>
                                <select
                                    value={formData.taskType}
                                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="classification">Classification</option>
                                    <option value="regression">Regression</option>
                                    <option value="generation">Generation (LLM)</option>
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!formData.projectName || loading}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                                >
                                    {loading ? 'Creating...' : 'Next: Create Model →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Create Model */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Step 3: Create Model</h2>
                            <p className="text-gray-600 mb-6">
                                Register the ML/LLM model you want to monitor
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Model Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.modelName}
                                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., fraud_xgboost"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Model Version *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.modelVersion}
                                    onChange={(e) => setFormData({ ...formData, modelVersion: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., v1.0"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!formData.modelName || !formData.modelVersion || loading}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                                >
                                    {loading ? 'Creating...' : 'Complete Setup →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {step === 4 && (
                        <div className="text-center py-8">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete! 🎉</h2>
                                <p className="text-gray-600 mb-6">
                                    Your monitoring project is ready to use
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                                <h3 className="font-semibold text-gray-900 mb-3">Created Resources:</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tenant:</span>
                                        <span className="font-medium text-gray-900">{formData.tenantName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Project:</span>
                                        <span className="font-medium text-gray-900">{formData.projectName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Task Type:</span>
                                        <span className="font-medium text-gray-900">{formData.taskType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Model:</span>
                                        <span className="font-medium text-gray-900">{formData.modelName} ({formData.modelVersion})</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                                <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                                    <li>Go to Drift Dashboard to create a baseline</li>
                                    <li>Start ingesting prediction events via API</li>
                                    <li>Monitor drift metrics in real-time</li>
                                </ol>
                            </div>

                            <button
                                onClick={handleComplete}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Go to Drift Dashboard →
                            </button>
                        </div>
                    )}
                </div>

                {/* Help Text */}
                {step < 4 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Need help? Check the{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-800">documentation</a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}