// ייבוא ספריית React הבסיסית ו-hook לניהול state
import React, { useState } from 'react';
// ייבוא רכיב FormField שיצרנו לשימוש חוזר
import FormField from '../FormField/FormField';
import { Button } from '../Button';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './PasswordInput.module.css';

// הגדרת הטיפוסים - מה ה-PasswordInput יכול לקבל כ-props
interface PasswordInputProps {
  // תכונות בסיסיות של שדה סיסמה
  name: string;                                         // שם השדה - חובה לטפסים
  label?: string;                                       // תווית השדה - אופציונלי (ברירת מחדל: "סיסמה")
  value?: string;                                       // הערך הנוכחי - אופציונלי
  defaultValue?: string;                                // ערך ברירת מחדל - אופציונלי
  placeholder?: string;                                 // טקסט עזר - אופציונלי
  
  // תכונות validation וטיפול בשגיאות
  required?: boolean;                                   // האם השדה חובה - אופציונלי
  disabled?: boolean;                                   // האם השדה מושבת - אופציונלי
  error?: boolean;                                      // האם יש שגיאה - אופציונלי
  errorMessage?: string;                                // הודעת שגיאה מותאמת - אופציונלי
  helperText?: string;                                  // טקסט עזר כללי - אופציונלי
  
  // תכונות מיוחדות לסיסמה
  showStrengthMeter?: boolean;                          // האם להציג מד חוזק סיסמה - אופציונלי
  allowToggleVisibility?: boolean;                      // האם לאפשר הצגה/הסתרה - אופציונלי
  
  // תכונות עיצוב
  size?: 'small' | 'medium' | 'large';                 // גודל השדה - אופציונלי
  variant?: 'outlined' | 'filled' | 'standard';        // סוג העיצוב - אופציונלי
  className?: string;                                   // קלאס נוסף - אופציונלי
  
  // פונקציות callback
  onChange?: React.ChangeEventHandler<HTMLInputElement>; // פונקציה שרצה בשינוי - אופציונלי
  onFocus?: React.FocusEventHandler<HTMLInputElement>;   // פונקציה שרצה בפוקוס - אופציונלי
  onBlur?: React.FocusEventHandler<HTMLInputElement>;    // פונקציה שרצה ביציאה מפוקוס - אופציונלי
}

// פונקציה לחישוב חוזק הסיסמה (0-4)
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;
  
  let strength = 0;
  
  // אורך מינימלי (8+ תווים)
  if (password.length >= 8) strength++;
  
  // יש אותיות קטנות
  if (/[a-z]/.test(password)) strength++;
  
  // יש אותיות גדולות
  if (/[A-Z]/.test(password)) strength++;
  
  // יש מספרים
  if (/\d/.test(password)) strength++;
  
    // יש תווים מיוחדים - זיהוי באמצעות Unicode properties כדי להימנע מתקלות ב-escaping
    if (/[^\p{L}\p{N}\s]/u.test(password)) strength++;
  
  return strength;
};

// פונקציה לקבלת תיאור חוזק הסיסמה
const getStrengthText = (strength: number): string => {
  switch (strength) {
    case 0: return '';
    case 1: return 'חלשה מאוד';
    case 2: return 'חלשה';
    case 3: return 'בינונית';
    case 4: return 'חזקה';
    case 5: return 'חזקה מאוד';
    default: return '';
  }
};

// פונקציה לקבלת צבע לפי חוזק הסיסמה
const getStrengthColor = (strength: number): string => {
  switch (strength) {
    case 1: return '#ff4444'; // אדום - חלשה מאוד
    case 2: return '#ff8800'; // כתום - חלשה
    case 3: return '#ffaa00'; // צהוב - בינונית
    case 4: return '#88cc00'; // ירוק בהיר - חזקה
    case 5: return '#00aa00'; // ירוק כהה - חזקה מאוד
    default: return '#cccccc'; // אפור - ללא סיסמה
  }
};

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const PasswordInput: React.FC<PasswordInputProps> = ({
  name,
  label = 'סיסמה',
  value,
  defaultValue,
  placeholder = '',
  required = false,
  disabled = false,
  error = false,
  errorMessage,
  helperText,
  showStrengthMeter = false,
  allowToggleVisibility = true,
  size = 'medium',
  variant = 'outlined',
  className = '',
  onChange,
  onFocus,
  onBlur,
}) => {
  // state לניהול הצגה/הסתרה של הסיסמה
  const [showPassword, setShowPassword] = useState(false);
  
  // state לניהול הערך הפנימי (לחישוב חוזק הסיסמה)
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  
  // פונקציה לטיפול בשינוי הערך
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    
    // קריאה לפונקציה החיצונית אם קיימת
    if (onChange) {
      onChange(event);
    }
  };
  
  // פונקציה לטיפול בלחיצה על כפתור העין
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // חישוב חוזק הסיסמה
  const passwordStrength = showStrengthMeter ? calculatePasswordStrength(internalValue) : 0;
  const strengthText = getStrengthText(passwordStrength);
  const strengthColor = getStrengthColor(passwordStrength);
  
  // חישוב הטקסט שיוצג מתחת לשדה
  let displayText = helperText;
  if (error && errorMessage) {
    displayText = errorMessage;
  } else if (showStrengthMeter && internalValue && strengthText) {
    displayText = `חוזק הסיסמה: ${strengthText}`;
  }
  
  return (
    <div className={`${styles.passwordInput} ${className}`}>
      {/* עטיפה של FormField עם input מותאם */}
      <div className={styles.passwordInput__wrapper}>
        <FormField
          name={name}
          label={label}
          type={showPassword ? 'text' : 'password'} // החלפה בין text ל-password
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          size={size}
          variant={variant}
          error={error}
          errorMessage={errorMessage}
          helperText={displayText}
        />
        
        {/* כפתור הצגה/הסתרה של הסיסמה */}
        {allowToggleVisibility && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className={styles.passwordInput__toggleButton}
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
          >
            <span className={styles.passwordInput__toggleIcon}>
              {showPassword ? '🙈' : '👁️'}
            </span>
          </Button>
        )}
      </div>
      
      {/* מד חוזק הסיסמה */}
      {showStrengthMeter && internalValue && (
        <div className={styles.passwordInput__strengthMeter}>
          <div className={styles.passwordInput__strengthBar}>
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`${styles.passwordInput__strengthSegment} ${level <= passwordStrength ? styles.passwordInput__strengthSegmentActive : ''}`}
                style={{
                  backgroundColor: level <= passwordStrength ? strengthColor : '#e0e0e0'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default PasswordInput;