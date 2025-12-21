// ייבוא ספריית React הבסיסית ו-hooks
import React, { useState } from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Footer.module.css';
// ייבוא רכיבי ה-UI הקיימים מהמערכת שלנו
import { Button } from '../../ui';
import { Input } from '../../ui';
import { Typography } from '../../ui';

// הגדרת טיפוסים לקישורי רשתות חברתיות
interface SocialLink {
  name: string;                  // שם הרשת החברתית
  icon: string;                  // אייקון (אימוג'י)
  url: string;                   // קישור לרשת החברתית
  color: string;                 // צבע מותאם לכל רשת
}

// הגדרת טיפוסים לקישורים מהירים
interface QuickLink {
  name: string;                  // שם הקישור
  url: string;                   // כתובת הקישור
  icon?: string;                 // אייקון אופציונלי
}

// הגדרת טיפוסים לקטגוריות קישורים
interface LinkSection {
  title: string;                 // כותרת הקטגוריה
  icon: string;                  // אייקון הקטגוריה
  links: QuickLink[];            // רשימת הקישורים
}

// הגדרת הטיפוסים - מה ה-Footer יכול לקבל כ-props
interface FooterProps {
  companyName?: string;          // שם החנות - אופציונלי
  address?: string;              // כתובת החנות - אופציונלי
  phone?: string;                // טלפון החנות - אופציונלי
  email?: string;                // אימייל החנות - אופציונלי
  socialLinks?: SocialLink[];    // רשימת רשתות חברתיות - אופציונלי
  showNewsletter?: boolean;      // האם להציג הרשמה לניוזלטר - אופציונלי
  onNewsletterSubmit?: (email: string) => void; // פונקציה לטיפול בהרשמה לניוזלטר - אופציונלי
}

// הגדרת קומפוננטת ה-Footer עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Footer: React.FC<FooterProps> = ({
  companyName = 'החנות שלי',
  address = 'רחוב הדוגמה 123, תל אביב',
  phone = '03-1234567',
  email = 'info@mystore.co.il',
  socialLinks = [],
  showNewsletter = true,
  onNewsletterSubmit
}) => {
  // ניהול מצב פנימי של הקומפוננטה
  const [newsletterEmail, setNewsletterEmail] = useState('');     // אימייל לניוזלטר
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false); // טעינה
  const [newsletterMessage, setNewsletterMessage] = useState(''); // הודעה להצגה

  // רשתות חברתיות ברירת מחדל
  const defaultSocialLinks: SocialLink[] = [
    {
      name: 'Facebook',
      icon: '📘',
      url: 'https://facebook.com',
      color: '#1877f2'
    },
    {
      name: 'Instagram',
      icon: '📷',
      url: 'https://instagram.com',
      color: '#e4405f'
    },
    {
      name: 'Email',
      icon: '📧',
      url: `mailto:${email}`,
      color: '#34495e'
    },
    {
      name: 'WhatsApp',
      icon: '📞',
      url: 'https://wa.me/972501234567',
      color: '#25d366'
    }
  ];

  // קטגוריות קישורים
  const linkSections: LinkSection[] = [
    {
      title: 'עלינו',
      icon: 'ℹ️',
      links: [
        { name: 'אודות החנות', url: '/about' },
        { name: 'מדיניות פרטיות', url: '/privacy' },
        { name: 'תנאי שימוש', url: '/terms' },
        { name: 'נגישות', url: '/accessibility' }
      ]
    },
    {
      title: 'שירות לקוחות',
      icon: '🤝',
      links: [
        { name: 'צור קשר', url: '/contact' },
        { name: 'שאלות נפוצות', url: '/faq' },
        { name: 'זמני משלוח', url: '/shipping' },
        { name: 'החזרות והחלפות', url: '/returns' },
        { name: 'מדיניות אחריות', url: '/warranty' }
      ]
    },
    {
      title: 'קישורים מהירים',
      icon: '⚡',
      links: [
        { name: 'דף בית', url: '/', icon: '🏠' },
        { name: 'כל המוצרים', url: '/products', icon: '🛍️' },
        { name: 'מבצעים', url: '/sales', icon: '🔥' },
        { name: 'חשבון', url: '/account', icon: '👤' },
        { name: 'עגלת קניות', url: '/cart', icon: '🛒' }
      ]
    }
  ];

  // טיפול בהרשמה לניוזלטר
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // בדיקת תקינות אימייל בסיסית
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setNewsletterMessage('נא להזין כתובת אימייל תקינה');
      return;
    }

    setIsNewsletterSubmitting(true);
    setNewsletterMessage('');

    try {
      // קריאה לפונקציה מהקומפוננטה האב אם קיימת
      if (onNewsletterSubmit) {
        await onNewsletterSubmit(newsletterEmail);
        setNewsletterMessage('נרשמת בהצלחה לניוזלטר! 🎉');
        setNewsletterEmail('');
      } else {
        // סימולציה של שליחה (בפרויקט אמיתי זה יהיה קריאה ל-API)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setNewsletterMessage('נרשמת בהצלחה לניוזלטר! 🎉');
        setNewsletterEmail('');
      }
    } catch (error) {
      setNewsletterMessage('אירעה שגיאה. נא לנסות שוב מאוחר יותר.');
      console.error('Newsletter subscription error:', error);
    } finally {
      setIsNewsletterSubmitting(false);
      // הסרת ההודעה אחרי 3 שניות
      setTimeout(() => setNewsletterMessage(''), 3000);
    }
  };

  // קביעת הרשתות החברתיות להצגה
  const socialLinksToShow = socialLinks.length > 0 ? socialLinks : defaultSocialLinks;

  return (
    <footer className={styles.footer}>
      {/* החלק העליון של הפוטר - קישורים וחלקים */}
      <div className={styles.footerTop}>
        <div className={styles.container}>
          <div className={styles.footerSections}>
            
            {/* רשתות חברתיות */}
            <div className={styles.section}>
              <Typography variant="h3" className={styles.sectionTitle}>
                🌐 רשתות חברתיות
              </Typography>
              <div className={styles.socialLinks}>
                {socialLinksToShow.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    className={styles.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.name}
                    data-social-color={social.color}
                  >
                    <span className={styles.socialIcon}>{social.icon}</span>
                    <span className={styles.socialName}>{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* קטגוריות קישורים */}
            {linkSections.map((section, index) => (
              <div key={index} className={styles.section}>
                <Typography variant="h3" className={styles.sectionTitle}>
                  {section.icon} {section.title}
                </Typography>
                <ul className={styles.linksList}>
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href={link.url} className={styles.footerLink}>
                        {link.icon && <span className={styles.linkIcon}>{link.icon}</span>}
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* הרשמה לניוזלטר */}
      {showNewsletter && (
        <div className={styles.newsletterSection}>
          <div className={styles.container}>
            <div className={styles.newsletterContent}>
              <div className={styles.newsletterText}>
                <Typography variant="h3" className={styles.newsletterTitle}>
                  📧 הירשם לניוזלטר שלנו
                </Typography>
                <Typography variant="body2" className={styles.newsletterDescription}>
                  קבל עדכונים על מוצרים חדשים, מבצעים מיוחדים וטיפים שימושיים
                </Typography>
              </div>
              
              <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
                <div className={styles.inputGroup}>
                  <Input
                    type="email"
                    placeholder="הזן את כתובת האימייל שלך"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    disabled={isNewsletterSubmitting}
                    className={styles.newsletterInput}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isNewsletterSubmitting || !newsletterEmail.trim()}
                  >
                    {isNewsletterSubmitting ? 'נרשם...' : 'הירשם'}
                  </Button>
                </div>
                
                {newsletterMessage && (
                  <Typography 
                    variant="body2" 
                    className={`${styles.newsletterMessage} ${
                      newsletterMessage.includes('בהצלחה') ? styles.success : styles.error
                    }`}
                  >
                    {newsletterMessage}
                  </Typography>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* החלק התחתון של הפוטר - מידע יצירת קשר וזכויות יוצרים */}
      <div className={styles.footerBottom}>
        <div className={styles.container}>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>📞</span>
              <a href={`tel:${phone}`} className={styles.contactLink}>
                {phone}
              </a>
            </div>
            
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>📍</span>
              <span className={styles.contactText}>{address}</span>
            </div>
            
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>📧</span>
              <a href={`mailto:${email}`} className={styles.contactLink}>
                {email}
              </a>
            </div>
          </div>
          
          <div className={styles.copyright}>
            <Typography variant="body2">
              © {new Date().getFullYear()} {companyName}. כל הזכויות שמורות.
            </Typography>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default Footer;
export { Footer };
