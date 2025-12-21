/**
 * תרשים עמודות - השוואות בין קטגוריות
 * 
 * מציג עמודות של:
 * - הכנסות יומיות (כחול)
 * - מספר הזמנות יומי (כתום)
 */

import React from 'react';
import type { TooltipProps } from 'recharts';
import {
  BarChart,
  Bar,
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

interface BarChartComponentProps {
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
 * קומפוננטת תרשים עמודות
 */
const BarChart: React.FC<BarChartComponentProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
        
        {/* Legend - סגנון */}
        <Legend 
          wrapperStyle={{ paddingTop: '16px' }}
        />
        
        {/* עמודות הכנסות - כחול */}
        <Bar
          dataKey="revenue"
          fill="var(--color-chart-1)"
          name="הכנסות (₪)"
          radius={[8, 8, 0, 0]}
          isAnimationActive={true}
          animationDuration={500}
          yAxisId="left"
        />
        
        {/* עמודות הזמנות - כתום */}
        <Bar
          dataKey="orders"
          fill="var(--color-chart-2)"
          name="הזמנות"
          radius={[8, 8, 0, 0]}
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
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
