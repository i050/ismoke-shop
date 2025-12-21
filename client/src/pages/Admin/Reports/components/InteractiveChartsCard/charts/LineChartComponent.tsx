/**
 * תרשים קווי - הכנסות לפי קבוצות לקוחות
 * 
 * מציג קו עבור כל קבוצת לקוח
 * כשגובה הקו משקף את סה"כ ההכנסות מאותה קבוצה
 */

import React from 'react';
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
  groupName: string;
  groupId: string | null;
  revenue: number;
  percentage?: number;
}

interface LineChartComponentProps {
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
 * קומפוננטת תרשים קווי
 * מציג קווים - כל קבוצה = קו בצבע שונה
 */
const LineChartComponent: React.FC<LineChartComponentProps> = ({ data }) => {
  // בדוק אם יש נתונים
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)' }}>
        אין נתונים להצגה
      </div>
    );
  }

  // המר נתונים לפורמט שמתאים ל-LineChart
  // כל row יהיה אובייקט עם groupName ו-revenue
  const chartData = data.map((item, index) => ({
    ...item,
    name: item.groupName,
    index: index
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--brand-primary)', strokeDasharray: '5 5' }} />
        
        {/* Legend - סגנון */}
        <Legend 
          wrapperStyle={{ paddingTop: '16px' }}
          iconType="line"
        />
        
        {/* קו הכנסות - כל קבוצה בצבע שונה */}
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={COLORS[0]}
          strokeWidth={3}
          dot={{ fill: COLORS[0], r: 6 }}
          activeDot={{ r: 8, fill: COLORS[0] }}
          name="הכנסות"
          isAnimationActive={true}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
