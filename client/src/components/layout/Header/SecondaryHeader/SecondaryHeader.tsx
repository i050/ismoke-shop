// ייבוא ספריית React הבסיסית
import React, { useState, useEffect } from 'react';
// ייבוא React Router לניווט
import { useNavigate } from 'react-router-dom';
// ייבוא קובץ הסגנונות שלנו (CSS Modules)
import styles from './SecondaryHeader.module.css';
import { Button } from '../../../../components/ui';
// ייבוא Redux hooks לגישה למצב ולפעולות
// שימוש ב-hooks המוקלדים של היישום במקום hooks גנריים
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import type { CategoryTreeNodeClient } from '@/services/categoryService';
// ייבוא ProductService עבור Prefetch אופטימיזציה של קטגוריות
import { ProductService } from '../../../../services/productService';
// ייבוא פעולות ו-selectors של קטגוריות מ-Redux
import { 
  fetchCategoriesTree,
  selectCategoriesTree,
  selectCategoriesLoading,
  selectCategoriesError,
  resetFilterTree
} from '../../../../store/slices/categoriesSlice';
// ייבוא טיפוסים של Redux

// הגדרת טיפוס לקטגוריה דינמית מה-API
interface CategoryForHeader {
  _id: string; // ID של הקטגוריה
  name: string; // שם הקטגוריה
  children: CategoryForHeader[]; // תת-קטגוריות
}

// קומפוננטת ההדר המשני עם Redux
const SecondaryHeader: React.FC = () => {
  // מצב לניהול איזה dropdown פתוח (למניעת פתיחה מרובה)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // hook לניווט פרוגרמטי
  const navigate = useNavigate();
  
  // גישה למצב ופעולות Redux
  const dispatch = useAppDispatch();
  const categoriesTree = useAppSelector(selectCategoriesTree);
  const loading = useAppSelector(selectCategoriesLoading);
  const error = useAppSelector(selectCategoriesError);

  // פונקציה להמרת עץ קטגוריות ל-format פשוט יותר להדר
  const convertTreeToHeaderFormat = (tree: CategoryTreeNodeClient[]): CategoryForHeader[] => {
    return tree.map(category => ({
      _id: category._id,
      name: category.name,
      children: category.children ? convertTreeToHeaderFormat(category.children) : []
    }));
  };

  // טעינת קטגוריות מ-Redux בטעינה ראשונה
  useEffect(() => {
    // טען קטגוריות רק אם אין נתונים או אם אין טעינה כרגע
    if (categoriesTree.length === 0 && !loading && !error) {
      dispatch(fetchCategoriesTree());
    }
  }, [dispatch, categoriesTree.length, loading, error]);

  // המרת הנתונים לפורמט מתאים להדר
  const categories = convertTreeToHeaderFormat(categoriesTree);

  return (
    // קונטיינר ראשי של ההדר המשני עם כיוון RTL
    <div className={styles.secondaryHeader}>
      <div className={styles.secondaryContainer}>
        {/* הצגת הודעת טעינה אם עדיין טוען */}
        {loading ? (
          <div className={styles.loading}>טוען קטגוריות...</div>
        ) : error ? (
          /* הצגת שגיאה אם יש */
          <div className={styles.error}>שגיאה: {error}</div>
        ) : (
          /* לולאה על כל הקטגוריות להצגתן כקישורים */
          categories.map((cat) => (
            <div
              key={cat._id}
              className={styles.categoryItem}
              onMouseEnter={() => setOpenDropdown(cat._id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {/* כפתור הקטגוריה עם hover לפתיחת dropdown וניווט בלחיצה */}
              <Button
                variant="ghost"
                className={styles.categoryButton}
                onClick={() => {
                  setOpenDropdown(null); // סגירת dropdown
                  dispatch(resetFilterTree()); // איפוס עץ הפילטרים
                  navigate(`/products?category=${encodeURIComponent(cat.name)}`); // ניווט לדף מוצרים
                }}
                onPointerEnter={() => {
                  // 🚀 Prefetch Products by Category כשהמשתמש מעביר עליה את העכבר
                  // זה חוסך זמן טעינה כשהמשתמש בעצם לוחץ על הקטגוריה
                  ProductService.preFetchProductsByCategory(cat.name);
                }}
              >
                {cat.name}
              </Button>
              {/* הצגת תת-קטגוריות אם יש ו-dropdown פתוח */}
              {cat.children && cat.children.length > 0 && openDropdown === cat._id && (
                <div className={styles.subDropdown}>
                  {/* לולאה על תת-קטגוריות עם קישורים לדף מוצרים */}
                  {cat.children.map((subCat) => (
                    <Button
                      key={subCat._id}
                      variant="ghost"
                      className={styles.subLink}
                      onClick={() => {
                        setOpenDropdown(null); // סגירת dropdown
                        dispatch(resetFilterTree()); // איפוס עץ הפילטרים
                        navigate(`/products?category=${encodeURIComponent(subCat.name)}`); // ניווט לדף מוצרים
                      }}
                      onPointerEnter={() => {
                        // 🚀 Prefetch Products by Subcategory כשהמשתמש מעביר עליה את העכבר
                        ProductService.preFetchProductsByCategory(subCat.name);
                      }}
                    >
                      {subCat.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ייצוא הקומפוננטה לשימוש במקומות אחרים
export default SecondaryHeader;
