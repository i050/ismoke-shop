/**
 * PromoBanner - בר פרומו להנחת סף (Threshold Discount)
 * 
 * מציג פס צבעוני מתחת ל-Header כשהנחת סף מופעלת בהגדרות החנות.
 * טוען את ההגדרות הציבוריות ומציג הודעה כמו:
 * "🎉 X% הנחה בקנייה מעל ₪X!"
 * 
 * @module components/layout/PromoBanner
 */

import { useState, useEffect } from 'react';
import { getPublicSettings } from '../../../services/settingsService';
import { Icon } from '../../ui';
import styles from './PromoBanner.module.css';

// טיפוס להגדרות הנחת סף
interface ThresholdDiscount {
  enabled: boolean;
  minimumAmount: number;
  discountPercentage: number;
}

const PromoBanner = () => {
  // הגדרות הנחת סף מהשרת
  const [thresholdDiscount, setThresholdDiscount] = useState<ThresholdDiscount | null>(null);

  // טעינת הגדרות ציבוריות בעליה לקומפוננטה
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getPublicSettings();
        if (response.success && response.data.thresholdDiscount) {
          setThresholdDiscount(response.data.thresholdDiscount);
        }
      } catch (err) {
        // במקרה של שגיאה - פשוט לא מציגים את הבאנר
        console.error('PromoBanner: שגיאה בטעינת הגדרות', err);
      }
    };

    loadSettings();
  }, []);

  // לא מציגים את הבאנר אם ההנחה לא מופעלת או לא נטענה
  if (!thresholdDiscount?.enabled) {
    return null;
  }

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true"><Icon name="Tag" size={18} /></span>
        <span className={styles.text}>
          <span className={styles.highlight}>{thresholdDiscount.discountPercentage}%</span>
          {' '}הנחה בקנייה מעל{' '}
          <span className={styles.highlight}>₪{thresholdDiscount.minimumAmount}</span>!
        </span>
      </div>
    </div>
  );
};

export default PromoBanner;
