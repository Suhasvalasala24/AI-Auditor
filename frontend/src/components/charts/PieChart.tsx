'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface PieChartProps {
  data: { name: string; value: number }[];
  colors: string[];
  title?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '200px',
        zIndex: 100
      }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#374151' }}>
          {payload[0].name}
        </p>
        <span style={{ fontSize: '13px', fontWeight: '700', color: payload[0].payload.fill }}>
          {payload[0].value}%
        </span>
      </div>
    );
  }
  return null;
};

export default function PieChart({ data, colors, title }: PieChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeData = Array.isArray(data)
    ? data.map((x) => ({
        name: String(x?.name ?? 'Unknown'),
        value: Number(x?.value ?? 0),
      }))
    : [];

  // Check if we have actual data vs just zeros
  const hasData = safeData.some((d) => d.value > 0);

  // If all zeros (e.g., Risk is 0), show a placeholder ring so it doesn't look broken
  const displayData = hasData ? safeData : [{ name: 'No Detected Risk', value: 100 }];
  const displayColors = hasData ? colors : ['#f3f4f6']; // Grey ring for zero risk

  if (!mounted) return <div style={{ height: '100%', width: '100%' }} />;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px', position: 'relative' }}>
      {title && (
        <h4 style={{ 
          position: 'absolute', top: 0, left: 0, 
          fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', zIndex: 10 
        }}>
          {title}
        </h4>
      )}
      
      {/* ✅ FORCE ABSOLUTE POSITIONING 
         This prevents the flexbox collapse bug by taking the chart out of the flow 
      */}
      <div style={{ position: 'absolute', top: title ? '20px' : '0', left: 0, right: 0, bottom: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
              stroke="none"
            >
              {displayData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={displayColors[index % displayColors.length]} />
              ))}
            </Pie>
            <Tooltip content={hasData ? <CustomTooltip /> : () => null} />
            {hasData && (
              <Legend 
                verticalAlign="bottom" 
                height={24} 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
        
        {/* Centered Label for Zero State */}
        {!hasData && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none'
          }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#d1d5db' }}>0%</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>RISK</div>
          </div>
        )}
      </div>
    </div>
  );
}