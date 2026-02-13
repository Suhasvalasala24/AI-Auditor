'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                background: '#fafafa',
            }}
        >
            {/* Sidebar */}
            <Sidebar />

            {/* Page Content */}
            <div
                style={{
                    flex: 1,
                    padding: '32px',
                    overflowY: 'auto',
                }}
            >
                {children}
            </div>
        </div>
    );
}