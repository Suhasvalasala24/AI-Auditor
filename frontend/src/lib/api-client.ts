'use client';

/**
 * Base API URL
 * MUST end at /api
 */
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://127.0.0.1:8000/api';

/**
 * Small helper: make sure numbers never break the UI
 */
export function safeNumber(v: any, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Normalize a path to always start with /
 */
function normalizePath(path: string) {
    return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Handle all API responses safely
 */
async function handleResponse(res: Response) {
    // ✅ NEW: Handle token expiration or invalidity
    if (res.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            // Avoid infinite redirect if already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
        let message = 'API error';
        try {
            const data = await res.json();
            message = data?.detail || data?.message || message;
        } catch {
            try {
                message = await res.text();
            } catch {
                message = message;
            }
        }
        throw new Error(message);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return res.text();
}

/**
 * Fetch wrapper with timeout (enterprise safe)
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 15000
) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    // ✅ NEW: Automatically inject the Bearer Token
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers = new Headers(options.headers);
    
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    try {
        const res = await fetch(url, {
            ...options,
            headers, // Use the updated headers
            signal: controller.signal,
        });
        return res;
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            throw new Error('Request timed out. Backend may be unreachable.');
        }
        throw err;
    } finally {
        clearTimeout(id);
    }
}

export async function apiGet<T = any>(path: string): Promise<T> {
    const res = await fetchWithTimeout(
        `${API_BASE}${normalizePath(path)}`,
        {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        },
        15000
    );

    return handleResponse(res) as Promise<T>;
}

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithTimeout(
        `${API_BASE}${normalizePath(path)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        },
        20000
    );

    return handleResponse(res) as Promise<T>;
}

/**
 * ✅ NEW: Explicit DELETE method for Model Management
 */
export async function apiDelete<T = any>(path: string): Promise<T> {
    const res = await fetchWithTimeout(
        `${API_BASE}${normalizePath(path)}`,
        {
            method: 'DELETE',
            headers: { Accept: 'application/json' },
        },
        15000
    );

    return handleResponse(res) as Promise<T>;
}

/**
 * Download file/blob (used for audit JSON report)
 */
export async function apiGetBlob(path: string): Promise<Blob> {
    const res = await fetchWithTimeout(
        `${API_BASE}${normalizePath(path)}`,
        {
            method: 'GET',
            headers: { Accept: 'application/json' },
        },
        20000
    );

    if (!res.ok) {
        let message = 'Download failed';
        try {
            const data = await res.json();
            message = data?.detail || data?.message || message;
        } catch {
            message = await res.text();
        }
        throw new Error(message);
    }

    return await res.blob();
}