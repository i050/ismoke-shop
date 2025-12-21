// ייבוא ספריית React הבסיסית
import React, { useState, useEffect, useRef } from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Header.module.css';
import { Icon } from '../../ui';
import { Button } from '@ui';
// ייבוא React Router
import { Link, useNavigate } from 'react-router-dom';
// ייבוא Redux
// שימוש ב-hook המוקלד של היישום במקום ה-useDispatch הגנרי
import { useAppSelector, useAppDispatch } from '../../../hooks/reduxHooks';
// ייבוא logout מה-authSlice
import { logout } from '../../../store/slices/authSlice';
// ייבוא מה-cartSlice
import { toggleMiniCart, selectCartItemsCount } from '../../../store/slices/cartSlice';
// ייבוא הקומפוננטה SecondaryHeader
import SecondaryHeader from './SecondaryHeader';
// ייבוא תפריט המבורגר למובייל
import MobileMenu from './MobileMenu';
// ייבוא ה-hook לזיהוי גודל מסך
import { useResponsive } from '../../../hooks/useResponsive';

// הגדרת הטיפוסים - מה ה-Header יכול לקבל כ-props
interface HeaderProps {
  onMenuToggle?: () => void;               // פונקציה לפתיחה/סגירה של התפריט - אופציונלי (legacy)
}

// הגדרת קומפוננטת ה-Header עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Header: React.FC<HeaderProps> = () => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  // מצב תפריט המבורגר למובייל
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // מצב שדה חיפוש במובייל - מוסתר/מוצג
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const user = useAppSelector(state => state.auth.user);
  const cartItemsCount = useAppSelector(selectCartItemsCount);
  // dispatch מוקלד מ‑AppDispatch — מאפשר לשלוח גם thunks בלי שגיאות טיפוס
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  // ref לשדה החיפוש במובייל - לפוקוס אוטומטי
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  // זיהוי גודל מסך - להצגת כפתור המבורגר
  const { isMobileOrTablet } = useResponsive();

  // פתיחת שדה חיפוש במובייל + פוקוס אוטומטי
  const handleToggleMobileSearch = () => {
    setIsMobileSearchOpen(prev => !prev);
    // פוקוס על שדה החיפוש אחרי פתיחה
    if (!isMobileSearchOpen) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  // סגירת dropdown כשלוחצים מחוץ לו
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);
  return (
    <>
    <header className={styles.header}>
      {/* קונטיינר פנימי לכל התוכן של ה-Header */}
      <div className={styles.container}>
        
        {/* === אזור ימין (RTL): המבורגר + חיפוש (במובייל) === */}
        <div className={styles.rightSection}>
          {/* כפתור המבורגר - מוצג רק במובייל/טאבלט */}
          {isMobileOrTablet && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.hamburgerButton}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="פתח תפריט קטגוריות"
              aria-expanded={isMobileMenuOpen}
            >
              <Icon name="Menu" size={24} />
            </Button>
          )}

          {/* אייקון חיפוש במובייל - פותח את שדה החיפוש */}
          {isMobileOrTablet && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.iconButton}
              onClick={handleToggleMobileSearch}
              aria-label={isMobileSearchOpen ? "סגור חיפוש" : "פתח חיפוש"}
              aria-expanded={isMobileSearchOpen}
            >
              <span className={styles.icon}><Icon name="Search" size={20} /></span>
            </Button>
          )}
        </div>

        {/* לוגו החנות - במרכז במובייל, מימין בדסקטופ */}
        <div className={styles.logo}>
          <Link to="/" className={styles.logoLink}>
            <img 
              src="/logo.svg" 
              alt="iSmoke Plus - החנות שלנו" 
              className={styles.logoImage}
              onError={(e) => {
                // במקרה שהתמונה לא נטענת, נחזיר לטקסט זמנית
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'inline';
                }
              }}
            />
            {/* <span className={styles.logoText}>iSmoke Plus</span> */}
          </Link>
        </div>

        {/* ניווט ראשי - מוסתר במובייל */}
        <nav className={styles.nav}>
          {/* <Link to="/" className={styles.navLink}>בית</Link> */}
          <Link to="/products" className={styles.navLink}>לכל המוצרים</Link>
        </nav>

        {/* שורת חיפוש מרכזית - רק בדסקטופ */}
        {!isMobileOrTablet && (
          <div className={styles.searchWrapper}>
            <input 
              type="text"
              placeholder="חפש מוצרים..."
              className={styles.searchInput}
            />
            <Button
              variant="ghost"
              size="sm"
              className={styles.searchButton}
              aria-label="חפש"
            >
              <Icon name="Search" size={18} />
            </Button>
          </div>
        )}

        {/* === אזור שמאל (RTL): פרופיל + עגלה === */}
        <div className={styles.icons}>
          {/* פרופיל עם dropdown */}
          {isAuthenticated ? (
            <div className={styles.profileContainer} ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.iconButton}
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                aria-label="פרופיל"
              >
                <span className={styles.icon}><Icon name="User" size={20} /></span>
              </Button>
              {isProfileDropdownOpen && (
                <div className={`${styles.profileDropdown} ${isProfileDropdownOpen ? styles.open : ''}`}>
                  <Link to="/profile" className={styles.dropdownLink} onClick={() => setIsProfileDropdownOpen(false)}>פרטי משתמש</Link>
                  {/* לינק לאזור ניהול - רק למנהלים */}
                  {(user?.role === 'admin' || user?.role === 'super_admin') && (
                    <Link to="/admin" className={`${styles.dropdownLink} ${styles.adminLink}`} onClick={() => setIsProfileDropdownOpen(false)}>
                      <Icon name="LayoutDashboard" size={16} />
                      <span>לוח ניהול</span>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.dropdownButton}
                    onClick={handleLogout}
                  >
                    התנתקות
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className={styles.iconButton} aria-label="התחברות">
              <span className={styles.icon}><Icon name="User" size={20} /></span>
            </Link>
          )}

          {/* עגלת קניות עם ספירה */}
          <Button
            variant="ghost"
            size="sm"
            className={styles.iconButton}
            onClick={() => dispatch(toggleMiniCart())}
            aria-label="עגלת קניות"
          >
            <span className={styles.icon}><Icon name="ShoppingCart" size={20} /></span>
            {cartItemsCount > 0 && (
              <span className={styles.cartCount} role="status" aria-label={`${cartItemsCount} פריטים בעגלה`}>
                {cartItemsCount}
              </span>
            )}
          </Button>
        </div>

      </div>

      {/* === שורת חיפוש מתרחבת במובייל === */}
      {isMobileOrTablet && (
        <div className={`${styles.mobileSearchBar} ${isMobileSearchOpen ? styles.open : ''}`}>
          <div className={styles.mobileSearchContainer}>
            {/* כפתור חיפוש (Enter) */}
            <Button
              variant="ghost"
              size="sm"
              className={styles.mobileSearchSubmit}
              aria-label="בצע חיפוש"
            >
              <Icon name="Search" size={20} />
            </Button>

            {/* שדה החיפוש */}
            <input 
              ref={mobileSearchInputRef}
              type="text"
              placeholder="חפש מוצרים..."
              className={styles.mobileSearchInput}
            />

            {/* כפתור סגירה (X) */}
            <Button
              variant="ghost"
              size="sm"
              className={styles.mobileSearchClose}
              onClick={handleToggleMobileSearch}
              aria-label="סגור חיפוש"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>
      )}
    </header>
    {/* הדר משני עם קטגוריות */}
    <SecondaryHeader />
    {/* תפריט המבורגר - מציג קטגוריות במובייל */}
    <MobileMenu 
      isOpen={isMobileMenuOpen} 
      onClose={() => setIsMobileMenuOpen(false)} 
    />
    </>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default Header;
