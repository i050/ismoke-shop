import React from 'react';
import styles from './AuthDivider.module.css';

// הגדרת טיפוסים
interface AuthDividerProps {
  text?: string;                      // טקסט להצגה (ברירת מחדל: "או")
  className?: string;                 // קלאס נוסף
}

// רכיב מפריד עם טקסט
const AuthDivider: React.FC<AuthDividerProps> = ({
  text = 'או',
  className,
}) => {
  return (
    <div className={`${styles.divider} ${className || ''}`}>
      <span className={styles.text}>{text}</span>
    </div>
  );
};

export default AuthDivider;
