/**
 * NativeSelect - קומפוננטת Select נייטיבית
 * מספקת מראה אחיד לכל הסלקטים באתר עם dropdown נייטיבי של הדפדפן
 */

import React from 'react';
import styles from './NativeSelect.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  /** רשימת אפשרויות */
  options: SelectOption[];
  /** ערך נוכחי */
  value: string;
  /** פונקציה לשינוי ערך */
  onChange: (value: string) => void;
  /** placeholder (אופציה ראשונה disabled) */
  placeholder?: string;
  /** label מעל הסלקט */
  label?: string;
  /** האם חובה */
  required?: boolean;
  /** הודעת שגיאה */
  error?: string;
  /** טקסט עזרה */
  hint?: string;
  /** גודל */
  selectSize?: 'sm' | 'md' | 'lg';
  /** האם להציג רק את הסלקט ללא wrapper */
  standalone?: boolean;
  /** className נוסף */
  className?: string;
}

/**
 * קומפוננטת Select נייטיבית עם עיצוב אחיד
 */
export const NativeSelect: React.FC<NativeSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
  hint,
  selectSize = 'md',
  standalone = false,
  className,
  disabled,
  id,
  ...rest
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const sizeClass = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[selectSize];

  const selectElement = (
    <select
      id={selectId}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`${styles.select} ${sizeClass} ${error ? styles.error : ''} ${className || ''}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );

  // אם standalone, מחזיר רק את הסלקט עצמו
  if (standalone) {
    return selectElement;
  }

  // אחרת, מחזיר עם wrapper, label, error, hint
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {selectElement}
      {error && (
        <span id={`${selectId}-error`} className={styles.errorText}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${selectId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
};

export default NativeSelect;
