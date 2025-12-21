/**
 * תרשים קווי - מגמות על פני זמן
 * 
 * מציג שתי קווים:
 * - הכנסות יומיות (כחול)
 * - מספר הזמנות יומי (כתום)
 */

import React from 'react';
import type { TooltipProps } from 'recharts';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
  products: number;
}

interface LineChartComponentProps {
  data: ChartData[];
}

/**
 * Custom Tooltip - עיצוב מותאם לעברית
 */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload) return null;

  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing-sm)',
      boxShadow: 'var(--shadow-lg)'
    }}>
      <p style={{ 
        margin: 0, 
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-primary)',
        fontWeight: 'bold'
      }}>
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{
          margin: '4px 0 0 0',
          fontSize: 'var(--font-size-xs)',
          color: entry.color || 'var(--color-text-secondary)'
        }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('he-IL') : 0}
        </p>
      ))}
    </div>
  );
};

/**
 * קומפוננטת תרשים קווי
 */
const LineChart: React.FC<LineChartComponentProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        {/* רשת רקע - עדין */}
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="var(--color-border)"
          opacity={0.3}
        />
        
        {/* ציר X - תאריכים */}
        <XAxis 
          dataKey="date"
          tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
        
        {/* ציר Y - ערכים */}
        <YAxis 
          tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
        
        {/* Tooltip מותאם */}
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--brand-primary)', strokeDasharray: '5 5' }} />
        
        {/* Legend - סגנון */}
        <Legend 
          wrapperStyle={{ paddingTop: '16px' }}
          iconType="line"
        />
        
        {/* קו הכנסות - כחול */}
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-1)', r: 4 }}
          activeDot={{ r: 6 }}
          name="הכנסות (₪)"
          isAnimationActive={true}
          animationDuration={500}
        />
        
        {/* קו הזמנות - כתום */}
        <Line
          type="monotone"
          dataKey="orders"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-2)', r: 4 }}
          activeDot={{ r: 6 }}
          name="הזמנות"
          isAnimationActive={true}
          animationDuration={500}
          yAxisId="right"
        />
        
        {/* ציר Y ימני לערכים שונים */}
        <YAxis 
          yAxisId="right"
          orientation="right"
          tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
