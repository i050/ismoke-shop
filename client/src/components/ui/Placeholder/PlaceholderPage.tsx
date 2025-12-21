import React from 'react';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import styles from './PlaceholderPage.module.css';

interface Feature {
  text: string;
  icon?: IconName;
}

interface PlaceholderPageProps {
  /** אייקון מרכזי */
  icon: IconName;
  /** כותרת ראשית */
  title: string;
  /** תיאור */
  description: string;
  /** רשימת פיצ'רים שיהיו זמינים */
  features?: Feature[];
  /** טקסט "בקרוב" */
  comingSoonText?: string;
}

/**
 * PlaceholderPage - דף placeholder אחיד לדפים בפיתוח
 * 
 * רכיב זה משמש להצגת דפים שעדיין בפיתוח באזור הניהול
 * מציג אייקון מרכזי, כותרת, תיאור ורשימת פיצ'רים עתידיים
 * 
 * דוגמה:
 * <PlaceholderPage
 *   icon="Package"
 *   title="ניהול מוצרים"
 *   description="כאן תוכל לנהל את כל המוצרים בחנות"
 *   features={[
 *     { text: 'הוספה ועריכת מוצרים', icon: 'Plus' },
 *     { text: 'ניהול מלאי', icon: 'Package' }
 *   ]}
 * />
 */
export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  icon,
  title,
  description,
  features = [],
  comingSoonText = 'בקרוב יהיה זמין'
}) => {
  return (
    <div className={styles.container}>
      {/* אייקון מרכזי */}
      <div className={styles.iconWrapper}>
        <Icon name={icon} size={64} />
      </div>

      {/* כותרת */}
      <h2 className={styles.title}>{title}</h2>

      {/* תיאור */}
      <p className={styles.description}>{description}</p>

      {/* תג "בקרוב" */}
      <div className={styles.comingSoon}>{comingSoonText}</div>

      {/* רשימת פיצ'רים */}
      {features.length > 0 && (
        <div className={styles.featuresBox}>
          <h3 className={styles.featuresTitle}>מה יהיה כאן:</h3>
          <ul className={styles.featureList}>
            {features.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                {feature.icon && <Icon name={feature.icon} size={18} />}
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
