/**
 * קובץ טיפוסים (Types) בסיסי למערכת הסינון.
 * המטרה בשלב זה: להגדיר "State" מינימלי שנוכל לבנות עליו בהמשך בלי לגרום לשינויים שבירים.
 * למה חשוב להפריד לטיפוסים? כדי שכל שאר הקבצים (לוגיקה, קומפוננטות) יתבססו על חוזה ברור ואחיד.
 */

/**
 * PriceRangeState
 * מייצג טווח מחיר שהמשתמש הגדיר.
 * שימוש ב-null (במקום 0) אומר: המשתמש לא הגדיר ערך → אל תצרף את הפרמטר ל-Query.
 */
export interface PriceRangeState {
  /** הערך המינימלי שבחר המשתמש | null = לא נבחר */
  min: number | null;
  /** הערך המקסימלי שבחר המשתמש | null = לא נבחר */
  max: number | null;
}

/**
 * SortKey
 * כל אפשרויות המיון האפשריות כרגע.
 * למה מחרוזת צרה (Union) ולא string רגיל? מקבלים זיהוי שגיאות בזמן קומפילציה אם ננסה ערך לא קיים.
 */
export type SortKey = 'priceAsc' | 'priceDesc' | 'recent' | 'popular';

/**
 * AttributesState
 * מבנה דינמי למאפייני סינון - כל מאפיין (key) מכיל מערך ערכים נבחרים
 * דוגמה: { colorFamily: ['red', 'blue'], size: ['M', 'L'], material: ['cotton'] }
 */
export interface AttributesState {
  [attributeKey: string]: string[];
}

/**
 * FiltersState
 * האובייקט המרכזי שמתאר את כל מצב הפילטרים בעמוד.
 * כולל מחיר, מיון, קטגוריות ומאפיינים דינמיים (צבע, גודל, חומר וכו')
 */
export interface FiltersState {
  /** טווח המחיר שהוגדר */
  price: PriceRangeState;
  /** שיטת המיון הנבחרת */
  sort: SortKey;
  /** קטגוריות נבחרות (מערך ריק = כל הקטגוריות) */
  categoryIds: string[];
  /** מאפיינים דינמיים נבחרים (צבע, גודל, חומר וכו') */
  attributes: AttributesState;
  /** חיפוש טקסט חופשי (autocomplete מה-Header) */
  search: string;
  /** עמוד נוכחי (1 מבוסס) */
  page: number;
  /** גודל עמוד (כמה פריטים בטעינה אחת) */
  pageSize: number;
}

/**
 * defaultFiltersState
 * מצב ברירת המחדל – נטען כשאין שום פרמטרים ב-URL או בעת איפוס (Clear All).
 */
export const defaultFiltersState: FiltersState = {
  price: { min: null, max: null },
  sort: 'recent',
  categoryIds: [],
  attributes: {}, // מאפיינים ריקים בהתחלה
  search: '', // חיפוש ריק בהתחלה
  page: 1,
  pageSize: 20
};

/**
 * הערה להמשך הרחבה:
 * המערכת תומכת עכשיו במאפיינים דינמיים דרך attributes object.
 * כל מאפיין שמוגדר ב-Backend (צבע, גודל, חומר וכו') יתווסף אוטומטית.
 * אפשר להוסיף בעתיד:
 *   inStock: boolean
 *   rating: number | null
 *   isPopular: boolean
 *   isNew: boolean
 *   וכו'...
 */
