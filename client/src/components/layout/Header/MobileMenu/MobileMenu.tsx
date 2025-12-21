/**
 * MobileMenu Component
 * ====================
 * תפריט המבורגר למובייל עם ניווט 3 רמות בקטגוריות
 * מציג את תוכן ה-SecondaryHeader בפורמט מותאם למובייל
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Button } from '@ui';
import styles from './MobileMenu.module.css';
// ייבוא Redux hooks ו-selectors
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { 
  fetchCategoriesTree,
  selectCategoriesTree,
  selectCategoriesLoading,
  resetFilterTree
} from '../../../../store/slices/categoriesSlice';
import type { CategoryTreeNodeClient } from '@/services/categoryService';

// ==================== Types ====================

interface MobileMenuProps {
  /** האם התפריט פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת התפריט */
  onClose: () => void;
}

/** מבנה פריט ניווט בתפריט */
interface MenuNavigationItem {
  id: string;
  title: string;
  level: number;
  items: MenuNavigationItem[];
}

// ==================== Component ====================

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // נתוני קטגוריות מ-Redux
  const categoriesTree = useAppSelector(selectCategoriesTree);
  const loading = useAppSelector(selectCategoriesLoading);
  
  // מצב הניווט - מחסנית של רמות
  const [navigationStack, setNavigationStack] = useState<MenuNavigationItem[]>([]);
  
  // ==================== Helper Functions ====================
  
  /**
   * המרת עץ קטגוריות מ-API לפורמט התפריט
   */
  const convertTreeToMenuFormat = useCallback((
    tree: CategoryTreeNodeClient[],
    level: number = 1
  ): MenuNavigationItem[] => {
    return tree.map(category => ({
      id: category._id,
      title: category.name,
      level,
      items: category.children ? convertTreeToMenuFormat(category.children, level + 1) : []
    }));
  }, []);
  
  /**
   * יצירת אובייקט התפריט הראשי
   */
  const createMainMenu = useCallback((): MenuNavigationItem => {
    return {
      id: 'main',
      title: 'קטגוריות',
      level: 0,
      items: convertTreeToMenuFormat(categoriesTree)
    };
  }, [categoriesTree, convertTreeToMenuFormat]);
  
  // ==================== Effects ====================
  
  // טעינת קטגוריות אם צריך
  useEffect(() => {
    if (categoriesTree.length === 0 && !loading) {
      dispatch(fetchCategoriesTree());
    }
  }, [dispatch, categoriesTree.length, loading]);
  
  // איפוס הניווט כשהתפריט נפתח
  useEffect(() => {
    if (isOpen && categoriesTree.length > 0) {
      setNavigationStack([createMainMenu()]);
    }
  }, [isOpen, categoriesTree, createMainMenu]);
  
  // מניעת גלילה של הדף כשהתפריט פתוח
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // ==================== Navigation Handlers ====================
  
  /**
   * ניווט לתת-קטגוריה (כניסה לרמה פנימית)
   */
  const handleNavigateToCategory = (item: MenuNavigationItem) => {
    if (item.items && item.items.length > 0 && item.level < 3) {
      // יש תת-קטגוריות ולא הגענו לרמה 3 - נכנס פנימה
      setNavigationStack(prev => [...prev, item]);
    } else {
      // אין תת-קטגוריות או רמה 3 - ניווט לדף
      handleNavigateToPage(item.id, item.title);
    }
  };
  
  /**
   * ניווט לדף מוצרים של קטגוריה
   */
  const handleNavigateToPage = (_id: string, title: string) => {
    onClose(); // סגירת התפריט
    dispatch(resetFilterTree()); // איפוס פילטרים
    navigate(`/products?category=${encodeURIComponent(title)}`);
  };
  
  /**
   * חזרה לרמה קודמת
   */
  const handleGoBack = () => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
    }
  };
  
  /**
   * סגירת התפריט ואיפוס הניווט
   */
  const handleClose = () => {
    onClose();
    // איפוס הניווט לאחר סגירה עם דיליי קטן לאנימציה
    setTimeout(() => {
      if (categoriesTree.length > 0) {
        setNavigationStack([createMainMenu()]);
      }
    }, 300);
  };
  
  // ==================== Render ====================
  
  // הרמה הנוכחית בתפריט
  const currentLevel = navigationStack[navigationStack.length - 1];
  
  // האם יש כפתור חזרה (לא בתפריט הראשי)
  const showBackButton = navigationStack.length > 1;
  
  return (
    <>
      {/* שכבת רקע כהה */}
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayActive : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* התפריט עצמו */}
      <div 
        className={`${styles.menu} ${isOpen ? styles.menuActive : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="תפריט קטגוריות"
      >
        {/* הדר התפריט */}
        <div className={styles.menuHeader}>
          {/* כפתור חזרה - מוצג רק אם לא בתפריט הראשי */}
          {showBackButton ? (
            <Button
              variant="ghost"
              className={styles.backButton}
              onClick={handleGoBack}
              aria-label="חזור לרמה קודמת"
            >
              <Icon name="ChevronRight" size={24} />
            </Button>
          ) : (
            <div className={styles.backButtonPlaceholder} />
          )}
          
          {/* כותרת הרמה הנוכחית */}
          <h2 className={styles.menuTitle}>
            {currentLevel?.title || 'קטגוריות'}
          </h2>
          
          {/* כפתור סגירה */}
          <Button
            variant="ghost"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="סגור תפריט"
          >
            <Icon name="X" size={24} />
          </Button>
        </div>
        
        {/* תוכן התפריט */}
        <div className={styles.menuContent}>
          {loading ? (
            // מצב טעינה
            <div className={styles.loading}>
              <Icon name="Loader2" size={24} className={styles.spinner} />
              <span>טוען קטגוריות...</span>
            </div>
          ) : currentLevel ? (
            // רשימת הפריטים
            <div className={styles.menuLevel}>
              {/* כפתור "כל המוצרים ב..." - מוצג רק אם לא בתפריט הראשי */}
              {currentLevel.level > 0 && currentLevel.items.length > 0 && (
                <Button
                  variant="ghost"
                  className={`${styles.menuItem} ${styles.viewAllItem}`}
                  onClick={() => handleNavigateToPage(currentLevel.id, currentLevel.title)}
                >
                  <span className={styles.menuItemText}>
                    כל המוצרים ב{currentLevel.title}
                  </span>
                  <Icon name="ExternalLink" size={18} className={styles.menuItemIcon} />
                </Button>
              )}
              
              {/* פריטי התפריט */}
              {currentLevel.items.map((item) => {
                // האם יש תת-פריטים ולא הגענו לרמה 3
                const hasSubItems = item.items && item.items.length > 0 && item.level < 3;
                
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={styles.menuItem}
                    onClick={() => handleNavigateToCategory(item)}
                  >
                    <span className={styles.menuItemText}>{item.title}</span>
                    {hasSubItems && (
                      <Icon name="ChevronLeft" size={20} className={styles.menuItemArrow} />
                    )}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
