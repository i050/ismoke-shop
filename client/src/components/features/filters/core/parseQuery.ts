/**
 * parseQuery
 * מקבל מחרוזת Query (לדוגמה window.location.search) ומחזיר FiltersState.
 * למה? כדי שבטעינת עמוד נוכל לשחזר את מצב הפילטרים מה-URL (שיתוף / רענון / חזרה אחורה).
 * 
 * תמיכה מיוחדת: פרמטר 'category' (שם קטגוריה) - ימור ל-categoryIds אם עץ הקטגוריות זמין בקאש
 */
import { defaultFiltersState } from '../types/filters';
import type { FiltersState, SortKey } from '../types/filters';
import { getCachedCategoriesTree, findNodeByName } from '@/services/categoryService';
import { buildCategoryDescendantsMap, getDescendantsFromMap } from '@/services/categoryHierarchyService';

/**
 * @param search מחרוזת ה-Query (יכולה להתחיל ב-? או להיות ריקה)
 * @returns מצב פילטרים מלא (כולל ערכי ברירת מחדל אם חסר)
 */
export function parseQuery(search: string): FiltersState {
  // אין מחרוזת? מחזירים מצב ברירת מחדל
  if (!search || search === '?') return defaultFiltersState;

  // מסירים ? בהתחלה אם קיים, ואז יוצרים URLSearchParams
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  // פרמטר sort – אם לא הוגדר משתמשים בברירת המחדל
  const sort = (params.get('sort') as SortKey) || defaultFiltersState.sort;

  // מחיר מינימלי ומקסימלי – אם לא קיימים נשארים null
  const priceMin = params.get('priceMin');
  const priceMax = params.get('priceMax');
  
  // עיבוד categoryIds מה-URL
  const categoryIdsRaw = params.get('categoryIds');
  let categoryIds = categoryIdsRaw 
    ? categoryIdsRaw.split(',').map(id => id.trim()).filter(id => id.length > 0)
    : [];

  // תמיכה בפרמטר 'category' (שם קטגוריה) - המרה ל-categoryIds
  // זה מאפשר ניווט מההדר המשני עם ?category=שם_הקטגוריה
  const categoryName = params.get('category');
  if (categoryName && categoryIds.length === 0) {
    // ננסה להמיר את שם הקטגוריה ל-ID אם עץ הקטגוריות זמין בקאש
    const cachedTree = getCachedCategoriesTree();
    if (cachedTree && cachedTree.length > 0) {
      const foundNode = findNodeByName(cachedTree, categoryName);
      if (foundNode) {
        // מצאנו את הקטגוריה - נוסיף אותה ואת כל הצאצאים שלה
        const descendantsMap = buildCategoryDescendantsMap(cachedTree);
        const descendants = getDescendantsFromMap(descendantsMap, foundNode._id);
        categoryIds = [foundNode._id, ...descendants];
      }
    }
    // אם אין קאש או לא מצאנו - categoryIds יישאר ריק
    // ו-ProductsPage יטפל בזה ב-useEffect הייעודי
  }

  const pageRaw = params.get('page');
  const pageSizeRaw = params.get('pageSize');
  const page = pageRaw ? Math.max(1, Number(pageRaw) || 1) : 1;
  const pageSize = pageSizeRaw ? Math.max(1, Number(pageSizeRaw) || 20) : 20;

  // פענוח מאפיינים דינמיים מה-URL
  // כל query param שלא מוכר (לא sort/price/categoryIds/page/pageSize/category) נחשב כמאפיין
  const attributes: { [key: string]: string[] } = {};
  const knownParams = new Set(['sort', 'priceMin', 'priceMax', 'categoryIds', 'category', 'page', 'pageSize']);
  
  params.forEach((value, key) => {
    if (!knownParams.has(key) && value) {
      // מפצל את הערכים לפי פסיק ומנקה רווחים
      attributes[key] = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    }
  });

  // החזרת אובייקט מצב מלא
  return {
    sort,
    price: {
      min: priceMin ? Number(priceMin) : null,
      max: priceMax ? Number(priceMax) : null
    },
    categoryIds,
    attributes,
    page,
    pageSize
  };
}
