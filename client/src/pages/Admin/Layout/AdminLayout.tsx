import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavigationPanel from '../components/NavigationPanel';
// TopBar temporarily disabled — re-enable when needed
// import TopBar from '../components/TopBar';
import styles from './AdminLayout.module.css';
// admin-variables.css הוסר - כל המשתנים עברו ל-design-tokens.css המרכזי
import { Button } from '../../../components/ui';
import { Icon } from '../../../components/ui';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * Layout ראשי לאזור הניהול
 * מכיל NavigationPanel צדדי, TopBar עליון ואזור תוכן מרכזי
 * משמש כמעטפת לכל דפי הניהול
 */
const AdminLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isMobileOrTablet } = useResponsive();

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.adminLayout}>
      {/* שכבת רקע כהה לתפריט מובייל */}
      {isMobileOrTablet && isMobileMenuOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={handleCloseMobileMenu}
        />
      )}

      {/* פאנל ניווט צדדי ימני */}
      <NavigationPanel 
        isOpen={isMobileOrTablet ? isMobileMenuOpen : true}
        onClose={handleCloseMobileMenu}
      />

      {/* אזור התוכן המרכזי */}
      <main className={styles.mainContent} data-scroll-container="admin-main">
        {/* Header קבוע למובייל/טאבלט עם המבורגר וכותרת */}
        {isMobileOrTablet && (
          <header className={styles.mobileHeader}>
            <Button
              variant="ghost"
              size="sm"
              className={styles.hamburgerButton}
              onClick={handleToggleMobileMenu}
              aria-label="פתח תפריט ניהול"
              aria-expanded={isMobileMenuOpen}
            >
              <Icon name="Menu" size={24} />
            </Button>
            <h1 className={styles.mobileTitle}>לוח ניהול</h1>
          </header>
        )}

    {/* פס עליון עם breadcrumbs ופעולות מהירות
      הושבת זמנית — משאירים את הייבוא כדי להחזיר בקלות בעתיד */}
    {/** <TopBar /> */}
        
        {/* תוכן הדף */}
        <div className={styles.pageContent}>
          {/* כאן יוצגו הדפים השונים דרך React Router */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
