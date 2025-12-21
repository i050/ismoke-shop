// ייבוא ספריית React הבסיסית
import React from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Typography.module.css';

// הגדרת הטיפוסים - מה הרכיב יכול לקבל כ-props
interface TypographyProps {
  children: React.ReactNode;                              // התוכן הטקסטואלי
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'button'; // סוג הטקסט
  color?: 'primary' | 'secondary' | 'text' | 'muted' | 'error' | 'success';  // צבע הטקסט - אופציונלי
  align?: 'left' | 'center' | 'right' | 'justify';       // יישור הטקסט - אופציונלי
  weight?: 'light' | 'normal' | 'medium' | 'bold';       // עובי הטקסט - אופציונלי
  className?: string;                                     // קלאס נוסף - אופציונלי
  as?: React.ElementType;                                 // איזה תג HTML לרנדר (h1, p, span וכו') - אופציונלי
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body1',       // ברירת מחדל: טקסט גוף רגיל
  color = 'text',          // ברירת מחדל: צבע טקסט רגיל
  align = 'right',         // ברירת מחדל: יישור לימין (עברית)
  weight = 'normal',       // ברירת מחדל: עובי רגיל
  className = '',          // ברירת מחדל: ללא קלאס נוסף
  as                       // ברירת מחדל תוגדר בלוגיקה למטה
}) => {
  // קביעת התג HTML המתאים לפי variant (אם לא הוגדר as)
  const getDefaultTag = (variant: string) => {
    if (variant.startsWith('h')) return variant as React.ElementType; // h1, h2, h3...
    if (variant === 'button') return 'span';
    if (variant === 'caption') return 'small';
    return 'p'; // body1, body2 וכל השאר
  };

  // קביעת התג הסופי
  const Component = as || getDefaultTag(variant);

  return (
    <Component
      // שילוב קלאסים: בסיסי + variant + צבע + יישור + עובי + קלאס נוסף
      className={`${styles.typography} ${styles[variant]} ${styles[color]} ${styles[align]} ${styles[weight]} ${className}`}
    >
      {children}            {/* התוכן הטקסטואלי */}
    </Component>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default Typography;
