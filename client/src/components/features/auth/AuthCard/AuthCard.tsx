// ייבוא ספריית React הבסיסית
import React from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './AuthCard.module.css';

// הגדרת הטיפוסים - מה הרכיב יכול לקבל כ-props
interface AuthCardProps {
  children: React.ReactNode;  // התוכן של הכרטיס (טפסים, כפתורים וכו')
  title: string;              // כותרת הכרטיס (למשל: "התחברות" או "הרשמה")
  className?: string;         // קלאס נוסף אופציונלי לעיצוב מותאם
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props
const AuthCard: React.FC<AuthCardProps> = ({
  children,
  title,
  className = ''              // ברירת מחדל: ללא קלאס נוסף
}) => {
  return (
    <div className={`${styles.authCard} ${className}`}>
      {/* כותרת הכרטיס */}
      <h2 className={styles.authCard__title}>
        {title}
      </h2>
      
      {/* תוכן הכרטיס - הטפסים והכפתורים שיועברו כ-children */}
      <div className={styles.authCard__content}>
        {children}
      </div>
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default AuthCard;