/**
 * תרשים עמודות - הכנסות לפי קבוצות לקוחות
 * 
 * מציג עמודה עבור כל קבוצת לקוח
 * כשגובה העמודה משקף את סה"כ ההכנסות מאותה קבוצה
 */

import React from 'react';
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
  groupName: string;
  groupId: string | null;
  revenue: number;
  percentage?: number;
}

interface BarChartComponentProps {
  data: ChartData[];
}

// צבעים עבור קבוצות שונות
const COLORS = [
  '#10b981', // ירוק - VIP
  '#3b82f6', // כחול - רגילה
  '#f59e0b', // כתום - מנויה
  '#a855f7', // סגול - ללא קבוצה
  '#ec4899', // ורוד - קבוצות נוספות
  '#06b6d4'  // ציאן
];

/**
 * Custom Tooltip - עיצוב מותאם לעברית
 */
const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;

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
        {data.groupName}
      </p>
      <p style={{
        margin: '4px 0 0 0',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)'
      }}>
        הכנסות: ₪{data.revenue.toLocaleString('he-IL')} ({data.percentage}%)
      </p>
    </div>
  );
};

/**
 * קומפוננטת תרשים עמודות
 */
const BarChartComponent: React.FC<BarChartComponentProps> = ({ data }) => {
  // בחירת צבע עבור כל בר
  const dataWithColor = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dataWithColor} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        {/* רשת רקע - עדין */}
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="var(--color-border)"
          opacity={0.3}
        />
        
        {/* ציר X - קבוצות */}
        <XAxis 
          dataKey="groupName"
          tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
          stroke="var(--color-border)"
          angle={data.length > 3 ? -45 : 0}
          textAnchor={data.length > 3 ? "end" : "middle"}
          height={data.length > 3 ? 80 : 30}
        />
        
        {/* ציר Y - הכנסות */}
        <YAxis 
          tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
          stroke="var(--color-border)"
          label={{ value: 'הכנסות (₪)', angle: -90, position: 'insideLeft' }}
        />
        
        {/* Tooltip מותאם */}
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
        
        {/* Legend - סגנון */}
        <Legend 
          wrapperStyle={{ paddingTop: '16px' }}
        />
        
        {/* עמודות הכנסות - צבע דינמי */}
        <Bar
          dataKey="revenue"
          fill="#10b981"
          name="הכנסות"
          radius={[8, 8, 0, 0]}
          isAnimationActive={true}
          animationDuration={500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
