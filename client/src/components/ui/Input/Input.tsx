// ייבוא ספריית React הבסיסית
import React from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Input.module.css';

// הגדרת הטיפוסים - מה ה-Input יכול לקבל כ-props
export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'; // סוג השדה - אופציונלי
  placeholder?: string;                                   // טקסט עזר - אופציונלי
  value?: string;                                         // הערך הנוכחי - אופציונלי
  defaultValue?: string;                                  // ערך ברירת מחדל - אופציונלי
  onChange?: React.ChangeEventHandler<HTMLInputElement>;  // פונקציה שרצה בשינוי - אופציונלי
  onFocus?: React.FocusEventHandler<HTMLInputElement>;    // פונקציה שרצה בפוקוס - אופציונלי
  onBlur?: React.FocusEventHandler<HTMLInputElement>;     // פונקציה שרצה ביציאה מפוקוס - אופציונלי
  disabled?: boolean;                                     // האם השדה מושבת - אופציונלי
  required?: boolean;                                     // האם השדה חובה - אופציונלי
  size?: 'small' | 'medium' | 'large';                   // גודל השדה - אופציונלי
  variant?: 'outlined' | 'filled' | 'standard';          // סוג העיצוב - אופציונלי
  error?: boolean;                                        // האם יש שגיאה - אופציונלי
  label?: string;                                         // תווית לשדה - אופציונלי
  helperText?: string;                                    // טקסט עזר נוסף - אופציונלי
  className?: string;                                     // קלאס נוסף - אופציונלי
  id?: string;                                           // מזהה לשדה - אופציונלי
  name?: string;                                         // שם השדה - אופציונלי
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Input: React.FC<InputProps> = ({
  type = 'text',           // ברירת מחדל: שדה טקסט רגיל
  placeholder = '',        // ברירת מחדל: ללא placeholder
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  disabled = false,        // ברירת מחדל: לא מושבת
  required = false,        // ברירת מחדל: לא חובה
  size = 'medium',         // ברירת מחדל: גודל בינוני
  variant = 'outlined',    // ברירת מחדל: עיצוב עם מסגרת
  error = false,           // ברירת מחדל: ללא שגיאה
  label,
  helperText,
  className = '',          // ברירת מחדל: ללא קלאס נוסף
  id,
  name
}) => {
  return (
    <div className={`${styles.inputContainer} ${className}`}>
      {/* תווית השדה - אם קיימת */}
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      {/* השדה עצמו */}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        id={id}
        name={name}
        // שילוב קלאסים: בסיסי + גודל + סוג + מצב שגיאה + מושבת
        className={`${styles.input} ${styles[size]} ${styles[variant]} ${error ? styles.error : ''} ${disabled ? styles.disabled : ''}`}
      />
      
      {/* טקסט עזר או הודעת שגיאה */}
      {helperText && (
        <div className={`${styles.helperText} ${error ? styles.errorText : ''}`}>
          {helperText}
        </div>
      )}
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export { Input };
