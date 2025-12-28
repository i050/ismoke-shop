import React from 'react';
import styles from './LogoLoader.module.css';

interface LogoLoaderProps {
  /** טקסט אופציונלי להציג מתחת ללוגו */
  text?: string;
  /** גודל הלוגו (ברירת מחדל: 400) */
  size?: number;
  /** className נוסף */
  className?: string;
}

/**
 * קומפוננטת LogoLoader - אנימציית כתיבה של לוגו iSmoke
 * מציגה את הלוגו בצורה של typewriter effect בזמן טעינה
 * 
 * @example
 * <LogoLoader text="טוען מוצרים..." />
 */
const LogoLoader: React.FC<LogoLoaderProps> = ({ 
  text, 
  size = 400,
  className = '' 
}) => {
  return (
    <div className={`${styles.loaderContainer} ${className}`}>
      {/* לוגו SVG עם אנימציית ציור - לוגו מקורי של iSmoke */}
      <svg
        className={styles.logo}
        width={size}
        height={size * 0.306} // יחס רוחב-גובה של הלוגו המקורי (68/222)
        viewBox="0 0 222 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="iSmoke טוען..."
      >
        <g transform="translate(0, 68) scale(0.1, -0.1)">
          {/* קווים עליונים */}
          <path
            className={`${styles.logoStroke} ${styles.topLine}`}
            d="M553 653 c306 -2 808 -2 1115 0 306 1 55 2 -558 2 -613 0 -864 -1 -557 -2z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* אות k */}
          <path
            className={`${styles.logoStroke} ${styles.letterK}`}
            d="M1368 245 c3 -148 5 -165 20 -165 14 0 16 8 14 55 l-4 55 34 -1 c27 0 40 -9 73 -48 25 -31 50 -50 68 -53 15 -2 27 -2 27 0 0 3 -23 32 -51 64 l-50 58 50 52 c28 29 51 56 51 61 0 4 -10 7 -21 7 -13 0 -40 -20 -67 -50 -37 -41 -51 -50 -79 -50 l-33 0 0 90 c0 79 -2 90 -17 90 -17 0 -18 -13 -15 -165z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* אות e */}
          <path
            className={`${styles.logoStroke} ${styles.letterE}`}
            d="M1746 383 c2 -16 1 -20 -2 -10 -3 9 -14 17 -25 17 -14 0 -19 -7 -19 -28 0 -19 -7 -30 -22 -37 -21 -9 -23 -17 -26 -106 -4 -127 -2 -129 128 -129 89 0 98 2 103 20 5 19 0 20 -94 20 l-99 0 0 30 0 30 95 0 95 0 0 45 c0 33 -4 45 -15 45 -9 0 -15 -9 -15 -25 0 -25 -1 -25 -79 -25 l-79 0 -4 33 -3 32 107 -1 c98 0 108 2 108 18 0 16 -10 18 -89 18 -50 0 -93 5 -96 10 -4 6 18 10 59 10 59 0 65 2 63 20 -2 27 -63 29 -70 3 -3 -11 -5 -7 -6 10 0 15 -5 27 -10 27 -4 0 -7 -12 -5 -27z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* אות S */}
          <path
            className={`${styles.logoStroke} ${styles.letterS}`}
            d="M421 367 c-14 -17 -8 -124 8 -140 7 -7 58 -14 124 -17 121 -5 127 -9 113 -66 -6 -23 -9 -24 -107 -24 -79 0 -101 3 -105 15 -8 20 -44 19 -44 -1 0 -42 64 -52 269 -44 24 1 31 121 9 147 -6 8 -49 13 -121 15 l-112 3 -3 42 -3 42 98 3 c68 2 103 -1 114 -9 17 -14 49 -17 49 -5 0 4 -7 18 -16 30 -14 21 -22 22 -138 22 -91 0 -126 -4 -135 -13z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* אותיות m */}
          <path
            className={`${styles.logoStroke} ${styles.letterM}`}
            d="M738 203 c2 -68 6 -123 10 -123 21 1 27 24 27 110 l0 95 58 3 57 3 0 -106 c0 -98 1 -105 20 -105 19 0 20 7 20 105 l0 105 53 -3 52 -2 3 -102 c2 -90 5 -103 20 -103 16 0 17 11 14 108 -2 59 -5 112 -7 119 -3 9 -51 13 -167 15 l-163 3 3 -122z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* אות i */}
          <path
            className={`${styles.logoStroke} ${styles.letterI}`}
            d="M330 200 c0 -113 1 -120 20 -120 19 0 20 7 20 120 0 113 -1 120 -20 120 -19 0 -20 -7 -20 -120z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* אות o */}
          <path
            className={`${styles.logoStroke} ${styles.letterO}`}
            d="M1112 308 c-15 -15 -16 -171 -2 -199 9 -17 22 -19 103 -19 59 0 97 4 105 12 8 8 12 46 12 103 0 57 -4 95 -12 103 -16 16 -190 16 -206 0z m183 -103 l0 -80 -78 -3 -77 -3 0 85 0 84 78 -1 77 -2 0 -80z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
          
          {/* קו תחתון */}
          <path
            className={`${styles.logoStroke} ${styles.bottomLine}`}
            d="M335 50 c4 -6 190 -10 526 -10 339 0 519 3 519 10 0 7 -182 10 -526 10 -347 0 -523 -3 -519 -10z"
            stroke="currentColor"
            strokeWidth="15"
            fill="none"
          />
        </g>
      </svg>
      
      {/* טקסט אופציונלי */}
      {text && (
        <p className={styles.loadingText}>{text}</p>
      )}
    </div>
  );
};

export default LogoLoader;
