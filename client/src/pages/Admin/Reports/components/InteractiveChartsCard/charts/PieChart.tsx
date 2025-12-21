/**
 * תרשים עוגה - התפלגויות
 * 
 * מציג התפלגות של:
 * - הכנסות
 * - הזמנות
 * - מוצרים
 */

import React from 'react';
import type { TooltipProps } from 'recharts';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
  products: number;
}

interface PieChartComponentProps {
  data: ChartData[];
}

/**
 * Custom Tooltip - עיצוב מותאם לעברית
 */
const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0];
  const percentage = (data.percent as number) ? ((data.percent as number) * 100).toFixed(1) : '0';

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
        {data.name}
      </p>
      <p style={{
        margin: '4px 0 0 0',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)'
      }}>
        ערך: {typeof data.value === 'number' ? data.value.toLocaleString('he-IL') : 0}
      </p>
      <p style={{
        margin: '2px 0 0 0',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)'
      }}>
        אחוז: {percentage}%
      </p>
    </div>
  );
};

/**
 * קומפוננטת תרשים עוגה
 */
const PieChart: React.FC<PieChartComponentProps> = ({ data }) => {
  // חישוב סכומים כוללים
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const totalProducts = data.reduce((sum, item) => sum + item.products, 0);

  // הנתונים להצגה
  const pieData = [
    { name: 'הכנסות', value: totalRevenue, color: 'var(--color-chart-1)' },
    { name: 'הזמנות', value: totalOrders * 100, color: 'var(--color-chart-2)' },
    { name: 'מוצרים', value: totalProducts * 50, color: 'var(--color-chart-3)' }
  ];

  // צבעים
  const COLORS = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)'
  ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsPieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          isAnimationActive={true}
          animationDuration={500}
        >
          {pieData.map((_entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        
        {/* Tooltip מותאם */}
        <Tooltip content={<CustomTooltip />} />
        
        {/* Legend - סגנון */}
        <Legend 
          wrapperStyle={{ paddingTop: '16px' }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart;
