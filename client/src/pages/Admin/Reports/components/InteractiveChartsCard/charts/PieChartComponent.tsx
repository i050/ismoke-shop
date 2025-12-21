/**
 * תרשים עוגה - התפלגות הכנסות לפי קבוצות לקוחות
 * 
 * מציג התפלגות של הכנסות בין קבוצות הלקוחות
 */

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  groupName: string;
  groupId: string | null;
  revenue: number;
  percentage?: number;
}

interface PieChartComponentProps {
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
  if (!active || !payload || payload.length === 0) return null;

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
        הכנסות: ₪{data.revenue.toLocaleString('he-IL')}
      </p>
      <p style={{
        margin: '2px 0 0 0',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)'
      }}>
        אחוז: {data.percentage}%
      </p>
    </div>
  );
};

/**
 * Custom Label - טקסט ממש רחוק מהעוגה
 */
const CustomLabel: React.FC<any> = (props: any) => {
  const { cx, cy, midAngle, outerRadius, value, payload } = props;
  
  // חישוב מיקום הטקסט ממש רחוק מהעוגה
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 120; // מרחק גדול מ-50 ל-120
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + Math.sin(-midAngle * RADIAN) * radius;

  return (
    <text
      x={x}
      y={y}
      fill="var(--color-text-primary)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="11"
      fontWeight="600"
    >
      <tspan x={x} dy="0">{payload.groupName}</tspan>
      <tspan x={x} dy="14">₪{value.toLocaleString('he-IL')}</tspan>
      <tspan x={x} dy="14">{payload.percentage}%</tspan>
    </text>
  );
};

/**
 * Custom Label Line - קו ממש ארוך מהעוגה לטקסט
 */
const renderCustomLabelLine = (props: any) => {
  const { points } = props;
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, outerRadius } = points[0];
  const radius = outerRadius + 120; // מרחק גדול
  
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + Math.sin(-midAngle * RADIAN) * radius;

  return (
    <g>
      <line
        x1={points[0].x}
        y1={points[0].y}
        x2={points[1].x}
        y2={points[1].y}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      <line
        x1={points[1].x}
        y1={points[1].y}
        x2={x}
        y2={y}
        stroke="var(--color-border)"
        strokeDasharray="3 3"
        strokeWidth={1}
      />
    </g>
  );
};

/**
 * קומפוננטת תרשים עוגה
 */
const PieChartComponent: React.FC<PieChartComponentProps> = ({ data }) => {
  // הנתונים להצגה - כל קבוצה עם הכנסותיה
  const pieData = data.map(item => ({
    ...item,
    value: item.revenue
  }));

  return (
    <ResponsiveContainer width="100%" height={450}>
      <RechartsPieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="40%"
          labelLine={renderCustomLabelLine}
          label={<CustomLabel />}
          outerRadius={80}
          innerRadius={0}
          fill="#8884d8"
          dataKey="value"
          isAnimationActive={true}
          animationDuration={500}
        >
          {pieData.map((_entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        
        {/* Tooltip מותאם - מציג שקלים ואחוזים */}
        <Tooltip content={<CustomTooltip />} />
        
        {/* Legend - סגנון */}
        <Legend 
          wrapperStyle={{ paddingTop: '16px' }}
          layout="horizontal"
          verticalAlign="bottom"
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
