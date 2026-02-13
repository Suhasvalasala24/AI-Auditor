'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: {
    oneMonth: { name: string; value: number }[];
    sixMonths: { name: string; value: number }[];
    oneYear: { name: string; value: number }[];
  };
  color: string;
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 100
      }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>
          {label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '800', color: '#111827' }}>
          Score: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function BarChart({ data, color, title }: BarChartProps) {
  const [timePeriod, setTimePeriod] = useState<'oneMonth' | 'sixMonths' | 'oneYear'>('oneMonth');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentData = useMemo(() => {
    const arr = data?.[timePeriod];
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return arr.map((x) => ({
      name: String(x?.name ?? ''),
      value: Number(x?.value ?? 0),
    }));
  }, [data, timePeriod]);

  if (!mounted) return <div style={{ height: '100%', width: '100%' }} />;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {title ? (
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>
            {title}
          </h4>
        ) : <div />}

        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '2px', borderRadius: '6px' }}>
          {['oneMonth', 'sixMonths', 'oneYear'].map((key) => {
            const active = timePeriod === key;
            const label = key === 'oneMonth' ? '1M' : key === 'sixMonths' ? '6M' : '1Y';
            return (
              <button
                key={key}
                onClick={() => setTimePeriod(key as any)}
                style={{
                  padding: '4px 8px', fontSize: '10px', fontWeight: 700, border: 'none', borderRadius: '4px',
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#111827' : '#9ca3af',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Area - Forced Flex Grow */}
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        {currentData.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '12px', fontWeight: 600 }}>
            Not enough data for trend
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={currentData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
                interval={0}
                tickMargin={8}
                // Truncate logic
                tickFormatter={(val) => val.length > 5 ? `${val.substring(0,4)}..` : val}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
                domain={[0, 100]} 
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar 
                dataKey="value" 
                fill={color} 
                radius={[4, 4, 0, 0]} 
                barSize={currentData.length < 4 ? 30 : 15} // Dynamic bar width
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}