// ייבוא ספריית React הבסיסית
import React from 'react';
// ייבוא רכיב Input הקיים לשימוש חוזר
import { Input } from '../Input/Input';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './FormField.module.css';

// הגדרת הטיפוסים - מה ה-FormField יכול לקבל כ-props
interface FormFieldProps {
  // תכונות בסיסיות של שדה טופס
  name: string;                                         // שם השדה - חובה לטפסים
  label?: string;                                       // תווית השדה - אופציונלי
  value?: string;                                       // הערך הנוכחי - אופציונלי
  defaultValue?: string;                                // ערך ברירת מחדל - אופציונלי
  
  // תכונות שדה קלט
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;                                 // טקסט עזר - אופציונלי
  required?: boolean;                                   // האם השדה חובה - אופציונלי
  disabled?: boolean;                                   // האם השדה מושבת - אופציונלי
  
  // תכונות validation וטיפול בשגיאות
  error?: boolean;                                      // האם יש שגיאה - אופציונלי
  errorMessage?: string;                                // הודעת שגיאה מותאמת - אופציונלי
  helperText?: string;                                  // טקסט עזר כללי - אופציונלי
  
  // תכונות עיצוב
  size?: 'small' | 'medium' | 'large';                 // גודל השדה - אופציונלי
  variant?: 'outlined' | 'filled' | 'standard';        // סוג העיצוב - אופציונלי
  className?: string;                                   // קלאס נוסף - אופציונלי
  
  // פונקציות callback
  onChange?: React.ChangeEventHandler<HTMLInputElement>; // פונקציה שרצה בשינוי - אופציונלי
  onFocus?: React.FocusEventHandler<HTMLInputElement>;   // פונקציה שרצה בפוקוס - אופציונלי
  onBlur?: React.FocusEventHandler<HTMLInputElement>;    // פונקציה שרצה ביציאה מפוקוס - אופציונלי
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  value,
  defaultValue,
  type = 'text',           // ברירת מחדל: שדה טקסט רגיל
  placeholder,
  required = false,        // ברירת מחדל: לא חובה
  disabled = false,        // ברירת מחדל: לא מושבת
  error = false,           // ברירת מחדל: ללא שגיאה
  errorMessage,
  helperText,
  size = 'medium',         // ברירת מחדל: גודל בינוני
  variant = 'outlined',    // ברירת מחדל: עיצוב עם מסגרת
  className = '',          // ברירת מחדל: ללא קלאס נוסף
  onChange,
  onFocus,
  onBlur
}) => {
  // חישוב הטקסט שיוצג מתחת לשדה (שגיאה או עזרה)
  const displayText = error && errorMessage ? errorMessage : helperText;
  
  return (
    <div className={`${styles.formField} ${className}`}>
      {/* שימוש חוזר ברכיב Input הקיים עם כל התכונות שלו */}
      <Input
        id={name}              // מזהה השדה יהיה זהה לשם
        name={name}            // שם השדה לטפסים
        type={type}            // סוג השדה
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        size={size}
        variant={variant}
        error={error}          // העברת מצב השגיאה ל-Input
        label={label}          // העברת התווית ל-Input
        helperText={displayText} // העברת הטקסט המתאים ל-Input
      />
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default FormField;