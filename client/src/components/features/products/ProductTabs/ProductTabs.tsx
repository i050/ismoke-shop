import React from 'react';
import { Typography, Button } from '@ui';
import { Icon } from '../../../ui/Icon';
import type { Product } from '../../../../types';
import styles from './ProductTabs.module.css';

interface ProductTabsProps {
  product: Product;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * כרטיסיות מידע המוצר - מחקה בדיוק את ה-HTML המצורף
 * כוללת תיאור, מפרט טכני, ביקורות ומדיניות
 */
const ProductTabs: React.FC<ProductTabsProps> = ({
  product,
  activeTab,
  onTabChange,
}) => {
  
  // הגדרת כרטיסיות המידע - בדיוק כמו ב-HTML
  const tabs = [
    {
      id: 'description',
      label: 'תיאור המוצר',
      content: (
        <div className={styles.tabContent}>
          {/* תיאור המוצר - מוזן על ידי המנהל באזור הניהול */}
          <Typography variant="body1" className={styles.description}>
            {product.description || 'תיאור המוצר לא זמין כרגע.'}
          </Typography>
        </div>
      )
    },
    {
      id: 'specifications',
      label: 'מפרט טכני',
      content: (
        <div className={styles.tabContent}>
          <div className={styles.specifications}>
            {/* מפרט טכני - מוזן על ידי המנהל באזור הניהול */}
            {product.specifications && product.specifications.length > 0 ? (
              <>
                {product.specifications.map((spec, index) => (
                  <div key={index} className={styles.specRow}>
                    <span className={styles.specLabel}>{spec.key}:</span>
                    <span className={styles.specValue}>{spec.value}</span>
                  </div>
                ))}
              </>
            ) : (
              <Typography variant="body2" className={styles.noSpecs}>
                אין מפרט טכני למוצר זה.
              </Typography>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'reviews',
      label: 'ביקורות (42)',
      content: (
        <div className={styles.tabContent}>
          <div className={styles.reviewsContainer}>
            
            {/* סיכום ביקורות */}
            <div className={styles.reviewsSummary}>
              <div className={styles.averageRating}>
                <span className={styles.ratingNumber}>4.2</span>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`${styles.star} ${star <= 4 ? styles.filled : ''}`}>
                      ★
                    </span>
                  ))}
                </div>
                <span className={styles.totalReviews}>מתוך 42 ביקורות</span>
              </div>
            </div>
            
            {/* דוגמאות ביקורות */}
            <div className={styles.reviewsList}>
              
              <div className={styles.review}>
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewerName}>דני כהן</span>
                  <div className={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`${styles.reviewStar} ${star <= 5 ? styles.filled : ''}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className={styles.reviewDate}>לפני 3 ימים</span>
                </div>
                <Typography variant="body2" className={styles.reviewText}>
                  מוצר מעולה! איכות בנייה גבוהה ועמידות טובה. הגיע במהירות ובאריזה מקצועית. בהחלט ממליץ!
                </Typography>
              </div>
              
              <div className={styles.review}>
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewerName}>שרה לוי</span>
                  <div className={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`${styles.reviewStar} ${star <= 4 ? styles.filled : ''}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className={styles.reviewDate}>לפני שבוע</span>
                </div>
                <Typography variant="body2" className={styles.reviewText}>
                  מוצר טוב בסך הכל. העיצוב יפה והפונקציונליות בסדר. השירות היה אדיב ומקצועי.
                </Typography>
              </div>
              
              <div className={styles.review}>
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewerName}>מיכאל אברהם</span>
                  <div className={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`${styles.reviewStar} ${star <= 3 ? styles.filled : ''}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className={styles.reviewDate}>לפני שבועיים</span>
                </div>
                <Typography variant="body2" className={styles.reviewText}>
                  המוצר בסדר אבל הצבע קצת שונה ממה שציפיתי. איכות סבירה למחיר.
                </Typography>
              </div>
            </div>
            
            <div className={styles.writeReview}>
              <Button className={styles.writeReviewButton} variant="primary">
                כתוב ביקורת
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'shipping',
      label: 'משלוח והחזרות',
      content: (
        <div className={styles.tabContent}>
          <div className={styles.shippingInfo}>
            
            <div className={styles.infoSection}>
              <Typography variant="h5" className={styles.infoTitle}>
                <Icon name="Truck" size={18} /> משלוח
              </Typography>
              <ul className={styles.infoList}>
                <li>משלוח חינם מעל ₪200</li>
                <li>זמן אספקה: 2-4 ימי עסקים</li>
                <li>משלוח אקספרס: 24 שעות (תוספת תשלום)</li>
                <li>איסוף מהחנות: ללא תשלום</li>
                <li>חיבור והתקנה: שירות זמין (תוספת תשלום)</li>
              </ul>
            </div>
            
            <div className={styles.infoSection}>
              <Typography variant="h5" className={styles.infoTitle}>
                <Icon name="Undo" size={18} /> החזרות
              </Typography>
              <ul className={styles.infoList}>
                <li>החזרה ללא תשלום תוך 30 יום</li>
                <li>המוצר חייב להיות באריזה המקורית</li>
                <li>החזרה עם שליח: 30₪ (מנוכה מהחזר כספי)</li>
                <li>החזרה לחנות: ללא תשלום</li>
                <li>זיכוי כספי תוך 7-14 ימי עסקים</li>
              </ul>
            </div>
            
            <div className={styles.infoSection}>
              <Typography variant="h5" className={styles.infoTitle}>
                <Icon name="Shield" size={18} /> אחריות
              </Typography>
              <ul className={styles.infoList}>
                <li>אחריות יצרן: שנה מלאה</li>
                <li>כיסוי פגמי ייצור</li>
                <li>תיקון או החלפה לפי שיקול דעת החברה</li>
                <li>שירות לקוחות 24/7</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={styles.tabsContainer}>
      
      {/* כותרות הכרטיסיות */}
      <div className={styles.tabHeaders}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            size="md"
            className={`${styles.tabHeader} ${
              activeTab === tab.id ? styles.tabHeaderActive : ''
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      
      {/* תוכן הכרטיסייה הפעילה */}
      <div className={styles.tabPanel}>
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default ProductTabs;
