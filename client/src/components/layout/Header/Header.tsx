// ייבוא ספריית React הבסיסית
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// ייבוא hook ל-debounce
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
// ייבוא service לחיפוש
import { ProductService } from '../../../services/productService';
import type { ProductSuggestion } from '../../../services/productService';

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
  
  // ============================================================================
  // 🔍 Autocomplete States
  // ============================================================================
  // טקסט החיפוש - דסקטופ
  const [searchQuery, setSearchQuery] = useState('');
  // טקסט החיפוש - מובייל
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  // הצעות מהשרת
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  // מצב טעינה
  const [isSearching, setIsSearching] = useState(false);
  // האם ה-dropdown פתוח
  const [showSuggestions, setShowSuggestions] = useState(false);
  // אינדקס הפריט הנבחר (keyboard navigation)
  const [selectedIndex, setSelectedIndex] = useState(-1);
  // ref לסגירת dropdown בלחיצה מחוץ לו
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);
  
  // debounce לטקסט החיפוש - מניעת קריאות API מרובות
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const debouncedMobileSearchQuery = useDebouncedValue(mobileSearchQuery, 300);
  
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const user = useAppSelector(state => state.auth.user);
  const cartItemsCount = useAppSelector(selectCartItemsCount);
  // dispatch מוקלד מ‑AppDispatch — מאפשר לשלוח גם thunks בלי שגיאות טיפוס
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  // ref לשדה החיפוש במובייל - לפוקוס אוטומטי
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  // ref לשדה החיפוש בדסקטופ
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  // זיהוי גודל מסך - להצגת כפתור המבורגר
  const { isMobileOrTablet } = useResponsive();

  // ============================================================================
  // 🔍 Autocomplete - קריאה לשרת
  // ============================================================================
  
  // פונקציה לשליפת הצעות מהשרת
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await ProductService.autocomplete(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1); // איפוס בחירה
    } catch (error) {
      // אם זה ביטול בקשה - לא שגיאה
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // effect לשליפת הצעות בעת שינוי הטקסט המושהה (דסקטופ)
  useEffect(() => {
    fetchSuggestions(debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchSuggestions]);
  
  // effect לשליפת הצעות בעת שינוי הטקסט המושהה (מובייל)
  useEffect(() => {
    fetchSuggestions(debouncedMobileSearchQuery);
  }, [debouncedMobileSearchQuery, fetchSuggestions]);
  
  // סגירת dropdown בלחיצה מחוץ לאזור החיפוש
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // בדיקה אם הלחיצה היא מחוץ לאזור החיפוש
      if (
        searchWrapperRef.current && !searchWrapperRef.current.contains(target) &&
        mobileSearchWrapperRef.current && !mobileSearchWrapperRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // ============================================================================
  // 🎹 Keyboard Navigation
  // ============================================================================
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      // Enter בלי הצעות - ניווט לדף חיפוש
      if (e.key === 'Enter') {
        const query = isMobileOrTablet ? mobileSearchQuery : searchQuery;
        if (query.trim()) {
          navigate(`/products?search=${encodeURIComponent(query.trim())}`);
          setShowSuggestions(false);
          setSearchQuery('');
          setMobileSearchQuery('');
          setIsMobileSearchOpen(false);
        }
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          // ניווט למוצר שנבחר
          const selected = suggestions[selectedIndex];
          navigate(`/product/${selected.slug || selected._id}`);
          setShowSuggestions(false);
          setSearchQuery('');
          setMobileSearchQuery('');
          setIsMobileSearchOpen(false);
        } else {
          // ניווט לדף חיפוש
          const query = isMobileOrTablet ? mobileSearchQuery : searchQuery;
          if (query.trim()) {
            navigate(`/products?search=${encodeURIComponent(query.trim())}`);
            setShowSuggestions(false);
            setSearchQuery('');
            setMobileSearchQuery('');
            setIsMobileSearchOpen(false);
          }
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, searchQuery, mobileSearchQuery, navigate, isMobileOrTablet]);
  
  // ============================================================================
  // בחירת הצעה
  // ============================================================================
  
  const handleSuggestionClick = useCallback((suggestion: ProductSuggestion) => {
    navigate(`/product/${suggestion.slug || suggestion._id}`);
    setShowSuggestions(false);
    setSearchQuery('');
    setMobileSearchQuery('');
    setIsMobileSearchOpen(false);
  }, [navigate]);
  
  // ============================================================================
  // פורמט מחיר
  // ============================================================================
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

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
          <div className={styles.searchWrapper} ref={searchWrapperRef}>
            <input 
              ref={desktopSearchInputRef}
              type="text"
              placeholder="חפש מוצרים..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
            />
            <Button
              variant="ghost"
              size="sm"
              className={styles.searchButton}
              aria-label="חפש"
              onClick={() => {
                if (searchQuery.trim()) {
                  navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  setShowSuggestions(false);
                  setSearchQuery('');
                }
              }}
            >
              {isSearching ? (
                <span className={styles.searchSpinner} />
              ) : (
                <Icon name="Search" size={18} />
              )}
            </Button>
            
            {/* Dropdown הצעות */}
            {showSuggestions && suggestions.length > 0 && (
              <ul 
                id="search-suggestions"
                className={styles.suggestionsDropdown}
                role="listbox"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion._id}
                    className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    {/* תמונה */}
                    <div className={styles.suggestionImage}>
                      {suggestion.thumbnail ? (
                        <img 
                          src={suggestion.thumbnail} 
                          alt={suggestion.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.noImage}>
                          <Icon name="Package" size={20} />
                        </div>
                      )}
                    </div>
                    
                    {/* פרטי המוצר */}
                    <div className={styles.suggestionDetails}>
                      <span className={styles.suggestionName}>{suggestion.name}</span>
                      <span className={styles.suggestionPrice}>
                        {suggestion.isOnSale && suggestion.salePrice ? (
                          <>
                            <span className={styles.salePrice}>{formatPrice(suggestion.salePrice)}</span>
                            <span className={styles.originalPrice}>{formatPrice(suggestion.basePrice)}</span>
                          </>
                        ) : (
                          formatPrice(suggestion.basePrice)
                        )}
                      </span>
                    </div>
                  </li>
                ))}
                
                {/* לינק לכל התוצאות */}
                <li className={styles.viewAllLink}>
                  <Link 
                    to={`/products?search=${encodeURIComponent(searchQuery)}`}
                    onClick={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                    }}
                  >
                    הצג את כל התוצאות עבור "{searchQuery}"
                    <Icon name="ArrowLeft" size={16} />
                  </Link>
                </li>
              </ul>
            )}
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
        <div 
          className={`${styles.mobileSearchBar} ${isMobileSearchOpen ? styles.open : ''}`}
          ref={mobileSearchWrapperRef}
        >
          <div className={styles.mobileSearchContainer}>
            {/* כפתור חיפוש (Enter) */}
            <Button
              variant="ghost"
              size="sm"
              className={styles.mobileSearchSubmit}
              aria-label="בצע חיפוש"
              onClick={() => {
                if (mobileSearchQuery.trim()) {
                  navigate(`/products?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
                  setShowSuggestions(false);
                  setMobileSearchQuery('');
                  setIsMobileSearchOpen(false);
                }
              }}
            >
              {isSearching ? (
                <span className={styles.searchSpinner} />
              ) : (
                <Icon name="Search" size={20} />
              )}
            </Button>

            {/* שדה החיפוש */}
            <input 
              ref={mobileSearchInputRef}
              type="text"
              placeholder="חפש מוצרים..."
              className={styles.mobileSearchInput}
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-controls="mobile-search-suggestions"
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
          
          {/* Dropdown הצעות במובייל */}
          {showSuggestions && suggestions.length > 0 && isMobileSearchOpen && (
            <ul 
              id="mobile-search-suggestions"
              className={styles.mobileSuggestionsDropdown}
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion._id}
                  className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  {/* תמונה */}
                  <div className={styles.suggestionImage}>
                    {suggestion.thumbnail ? (
                      <img 
                        src={suggestion.thumbnail} 
                        alt={suggestion.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.noImage}>
                        <Icon name="Package" size={20} />
                      </div>
                    )}
                  </div>
                  
                  {/* פרטי המוצר */}
                  <div className={styles.suggestionDetails}>
                    <span className={styles.suggestionName}>{suggestion.name}</span>
                    <span className={styles.suggestionPrice}>
                      {suggestion.isOnSale && suggestion.salePrice ? (
                        <>
                          <span className={styles.salePrice}>{formatPrice(suggestion.salePrice)}</span>
                          <span className={styles.originalPrice}>{formatPrice(suggestion.basePrice)}</span>
                        </>
                      ) : (
                        formatPrice(suggestion.basePrice)
                      )}
                    </span>
                  </div>
                </li>
              ))}
              
              {/* לינק לכל התוצאות */}
              <li className={styles.viewAllLink}>
                <Link 
                  to={`/products?search=${encodeURIComponent(mobileSearchQuery)}`}
                  onClick={() => {
                    setShowSuggestions(false);
                    setMobileSearchQuery('');
                    setIsMobileSearchOpen(false);
                  }}
                >
                  הצג את כל התוצאות עבור "{mobileSearchQuery}"
                  <Icon name="ArrowLeft" size={16} />
                </Link>
              </li>
            </ul>
          )}
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
