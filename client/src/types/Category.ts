// ===== טיפוסי קטגוריות =====
// קובץ זה מגדיר את כל הטיפוסים הקשורים לקטגוריות במערכת

// ממשק תמונת קטגוריה
export interface CategoryImage {
  url: string;
  public_id: string;
}

// ממשק קטגוריה מלא - תואם למודל בשרת
export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;           // רמה בעץ (0 = ראשי, 1 = תת-קטגוריה, וכו')
  path: string;            // נתיב מלא: /electronics/smartphones
  isActive: boolean;       // האם הקטגוריה פעילה
  sortOrder: number;       // סדר תצוגה
  description?: string;    // תיאור לSEO
  image?: CategoryImage;   // תמונת קטגוריה
  createdAt: string;
  updatedAt: string;
}

// טיפוס לתאימות אחורה - שדה ישן
export interface CategoryLegacy {
  _id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;  // שם ישן - משתמשים ב-parentId
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// בקשת יצירת קטגוריה חדשה
export interface CategoryCreateRequest {
  name: string;
  slug?: string;           // אופציונלי - ייווצר אוטומטית מהשם
  parentId?: string | null;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// בקשת עדכון קטגוריה קיימת
export interface CategoryUpdateRequest {
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// סטטיסטיקות קטגוריה - מוחזר מ-API stats
export interface CategoryStats {
  subcategoriesCount: number;       // מספר תת-קטגוריות ישירות
  productsCount: number;            // מספר מוצרים בקטגוריה עצמה
  descendantProductsCount: number;  // מספר מוצרים כולל צאצאים
}

// אפשרויות מחיקה בטוחה
export interface CategoryDeleteOptions {
  deleteSubcategories?: boolean;   // האם למחוק גם תת-קטגוריות
  reassignTo?: string | null;      // להעביר מוצרים לקטגוריה אחרת
}

// תוצאת מחיקה בטוחה
export interface CategoryDeleteResult {
  success: boolean;
  message: string;
  affected: number;  // מספר מוצרים שהושפעו
}

// פריט לשינוי סדר
export interface CategoryReorderItem {
  id: string;
  sortOrder: number;
}
