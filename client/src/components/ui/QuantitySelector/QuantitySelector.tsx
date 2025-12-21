// QuantitySelector - קומפוננטה לבחירת כמות מוצר
// מכילה כפתורי + ו- וערך מספרי באמצע

import { useState, useEffect } from 'react';
import styles from './QuantitySelector.module.css';

// ממשק Props של הקומפוננטה
interface QuantitySelectorProps {
  value: number;                      // הכמות הנוכחית
  min?: number;                       // כמות מינימלית (ברירת מחדל: 1)
  max?: number;                       // כמות מקסימלית (אופציונלי - מלאי)
  onChange: (quantity: number) => void; // פונקציה שתקרא כאשר הכמות משתנה
  disabled?: boolean;                 // האם הקומפוננטה מושבתת
  size?: 'small' | 'medium' | 'large'; // גודל הקומפוננטה
  onOverMax?: (max?: number) => void;  // קוראים כאשר המשתמש לוחץ + מעבר למקס (למטרות הודעה)
  showInlineMaxWarning?: boolean; // האם להציג הודעת מלאי בתוך השליטה עצמה (ברירת מחדל: false)
}

/**
 * קומפוננטת QuantitySelector
 * מאפשרת למשתמש לבחור כמות באמצעות כפתורים או הקלדה ישירה
 */
const QuantitySelector = ({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  size = 'medium',
  onOverMax,
  showInlineMaxWarning = false,
}: QuantitySelectorProps) => {
  // state מקומי לניהול ערך ה-input
  const [inputValue, setInputValue] = useState(value.toString());

  // סינכרון ערך הממשק עם ה-prop value
  // חשוב כדי שהתצוגה תשקף שינויים חיצוניים (rollback, עדכון מהשרת ועוד)
  useEffect(() => {
    const valueStr = String(value);
    if (inputValue !== valueStr) {
      setInputValue(valueStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // פונקציה להפחתת כמות
  const handleDecrease = () => {
    if (disabled) return;
    const newValue = Math.max(min, value - 1);
    if (newValue !== value) {
      onChange(newValue);
      setInputValue(newValue.toString());
    }
  };

  // פונקציה להגדלת כמות
  const handleIncrease = () => {
    if (disabled) return;
    const candidate = value + 1;
    if (max !== undefined && candidate > max) {
      // לא נשלח בקשה לשרת; במקום זאת נודיע למי שהתקין onOverMax
      if (typeof (onOverMax) === 'function') onOverMax(max);
      // עדכונים מקומיים נשמרים ב-parent (אין שינוי כמות)
      // ניתן להוסיף כאן אנימציה מקומית אם רוצים
      return;
    }

    const newValue = max ? Math.min(max, candidate) : candidate;
    if (newValue !== value) {
      onChange(newValue);
      setInputValue(newValue.toString());
    }
  };

  // פונקציה לטיפול בשינוי ה-input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // אפשר רק מספרים
    if (!/^\d*$/.test(newValue)) return;
    
    setInputValue(newValue);
  };

  // פונקציה לטיפול כשה-input מאבד focus
  const handleInputBlur = () => {
    // קראו את הערך כפי שהוקלד (לפני clamping) כדי לדעת האם המשתמש "ניסה" לעבור את המקס
    const raw = parseInt(inputValue, 10);
    if (!Number.isNaN(raw) && max !== undefined && raw > max) {
      if (typeof onOverMax === 'function') onOverMax(max);
    }

    let numValue = parseInt(inputValue, 10) || min;

    // ולידציה של הערך והגבלת טווח
    if (numValue < min) numValue = min;
    if (max !== undefined && numValue > max) numValue = max;

    onChange(numValue);
    setInputValue(numValue.toString());
  };

  // פונקציה לטיפול בלחיצת Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  // בדיקה האם כפתור ההפחתה מושבת
  const isDecreaseDisabled = disabled || value <= min;
  
  // בדיקה האם כפתור ההגדלה מושבת
  // אל תכבה את כפתור ההגדלה רק בגלל מלאי — רק במצב disabled גלובלי
  const isIncreaseDisabled = disabled;

  // בדיקה האם להציג הודעת מלאי מקומית בתוך ה-control (אם המפתח ביקש זאת)
  const parsedInput = inputValue ? parseInt(inputValue, 10) : NaN;
  const showMaxWarning = max !== undefined && ((!isNaN(parsedInput) && parsedInput > max) || value >= max);

  return (
    <div className={`${styles.quantitySelector} ${styles[size]}`}>
      {/* כפתור הפחתה */}
      <button
        type="button"
        className={styles.button}
        onClick={handleDecrease}
        disabled={isDecreaseDisabled}
        aria-label="הפחת כמות"
      >
        <span className={styles.icon}>−</span>
      </button>

      {/* שדה הכמות */}
      <input
        type="number"
        className={styles.input}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        min={min}
        max={max}
        aria-label="כמות"
      />

      {/* כפתור הגדלה */}
      <button
        type="button"
        className={styles.button}
        onClick={handleIncrease}
        disabled={isIncreaseDisabled}
        aria-label="הגדל כמות"
      >
        <span className={styles.icon}>+</span>
      </button>

      {/* הודעת מלאי נמוך (אם רלוונטי) */}
      {showInlineMaxWarning && showMaxWarning && (
        <span className={styles.maxWarning} role="status">
          במלאי יש רק {max} יחידות
        </span>
      )}
    </div>
  );
};

export default QuantitySelector;
