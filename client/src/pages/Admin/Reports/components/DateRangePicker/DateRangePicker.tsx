/**
 * כרטיס בחירת טווח תאריכים - קומפוננטה לבחירת תקופה לדוחות
 */

import React, { useState } from 'react';
import { Icon, type IconName } from '@ui';
import styles from './DateRangePicker.module.css';

// ============================================================================
// Types
// ============================================================================

export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset: DateRangePreset;
}

export interface DateRangePickerProps {
  /** טווח תאריכים נבחר */
  value: DateRange;
  /** קולבק לשינוי */
  onChange: (range: DateRange) => void;
  /** האם להציג בורר תאריכים מותאם */
  showCustomPicker?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PRESETS: { value: DateRangePreset; label: string; icon: IconName }[] = [
  { value: 'today', label: 'היום', icon: 'Calendar' },
  { value: 'yesterday', label: 'אתמול', icon: 'Clock' },
  { value: 'week', label: 'שבוע', icon: 'Calendar' },
  { value: 'month', label: 'חודש', icon: 'Calendar' },
  { value: 'quarter', label: 'רבעון', icon: 'BarChart3' },
  { value: 'year', label: 'שנה', icon: 'TrendingUp' },
];

// ============================================================================
// Component
// ============================================================================

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  showCustomPicker = false
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // חישוב תאריכים לפי preset
  const handlePresetClick = (preset: DateRangePreset) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = today;
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'yesterday': {
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        startDate = yesterday;
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'week': {
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        startDate = weekAgo;
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'quarter': {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'year': {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      default: {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }
    }

    onChange({ startDate, endDate, preset });
  };

  return (
    <div className={styles.container}>
      <div className={styles.presetsRow}>
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`${styles.presetButton} ${value.preset === preset.value ? styles.active : ''}`}
            onClick={() => handlePresetClick(preset.value)}
            type="button"
          >
            <Icon name={preset.icon} size={16} />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {showCustomPicker && (
        <button 
          className={`${styles.customButton} ${value.preset === 'custom' ? styles.active : ''}`}
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          type="button"
        >
          <Icon name="Calendar" size={16} />
          <span>בחר תאריכים</span>
        </button>
      )}
    </div>
  );
};

export default DateRangePicker;
