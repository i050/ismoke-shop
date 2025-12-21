// קומפוננטת Checkbox נגישה לשימוש חוזר
// תומכת ב-RTL, מצב מושבת, ותווית לחיצה.
import React from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps {
  checked: boolean;                 // האם מסומן
  onChange: (checked: boolean) => void; // שינוי מצב
  label?: React.ReactNode;          // תווית להצגה ליד התיבה
  disabled?: boolean;               // מצב מושבת
  id?: string;                      // מזהה (לגישה חיצונית)
  name?: string;                    // שם קבוצתי
  className?: string;               // קלאס מותאם
  indeterminate?: boolean;          // מצב ביניים (למשל "חלקי")
  required?: boolean;               // האם חובה
  helperText?: string;              // טקסט עזר משני
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  name,
  className = '',
  indeterminate = false,
  required = false,
  helperText
}) => {
  const internalId = React.useId();
  const inputId = id || internalId;
  const ref = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !checked && indeterminate;
    }
  }, [checked, indeterminate]);

  return (
    <div className={`${styles.wrapper} ${className}`}>      
      <label htmlFor={inputId} className={`${styles.label} ${disabled ? styles.disabledLabel : ''}`}>        
        <span className={styles.boxWrapper}>
          <input
            id={inputId}
            name={name}
            ref={ref}
            type="checkbox"
            className={styles.input}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            required={required}
          />
          <span className={`${styles.box} ${checked ? styles.boxChecked : ''} ${indeterminate ? styles.boxIndeterminate : ''}`}>            
            {indeterminate && !checked && (<span className={styles.indeterminateBar} />)}
            {checked && !indeterminate && (
              <svg className={styles.checkIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.285 6.709a1 1 0 0 0-1.414-1.418L9 15.17l-3.88-3.88a1 1 0 1 0-1.414 1.415l4.587 4.586a1 1 0 0 0 1.414 0l10.578-10.58Z" />
              </svg>
            )}
          </span>
        </span>
        {label && (
          <span className={styles.text}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </span>
        )}
      </label>
      {helperText && (
        <div className={`${styles.helper} ${disabled ? styles.helperDisabled : ''}`}>{helperText}</div>
      )}
    </div>
  );
};

export default Checkbox;
