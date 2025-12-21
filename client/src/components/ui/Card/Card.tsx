// ייבוא ספריית React הבסיסית
import React from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Card.module.css';

// הגדרת הטיפוסים - מה הכרטיס יכול לקבל כ-props
interface CardProps {
  children: React.ReactNode;                              // התוכן שבתוך הכרטיס
  variant?: 'default' | 'elevated' | 'outlined';         // סוג הכרטיס (רגיל/מוגבה/עם מסגרת) - אופציונלי
  padding?: 'none' | 'small' | 'medium' | 'large';      // גודל הריווח הפנימי - אופציונלי
  onClick?: () => void;                                   // פונקציה שרצה בלחיצה - אופציונלי
  className?: string;                                     // קלאס נוסף - אופציונלי
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',     // ברירת מחדל: כרטיס רגיל
  padding = 'medium',      // ברירת מחדל: ריווח בינוני
  onClick,
  className = ''           // ברירת מחדל: ללא קלאס נוסף
}) => {
  return (
    <div
      // שילוב קלאסים: בסיסי + סוג + ריווח + קלאס נוסף (אם יש)
      className={`${styles.card} ${styles[variant]} ${styles[padding]} ${className}`}
      onClick={onClick}      // העברת פונקציית הלחיצה (אם יש)
    >
      {children}            {/* התוכן שמוצג בתוך הכרטיס */}
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export { Card };
