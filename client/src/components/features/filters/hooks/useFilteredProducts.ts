import { useEffect, useRef, useState } from 'react';
import { ProductService } from '@/services/productService';
import type { FilteredProductsRequestParams } from '@/services/productService';
import { ApiError } from '../../../../utils/ApiError';
import type { FiltersState } from '../types/filters';
import type { Product } from '../../../../types/Product';
import { buildQuery } from '../core/buildQuery';
// ייבוא אוספן מדידות מרכזי - יאפשר שליחה ל-console או ל-endpoint לפי env
import collectPerfMeasure from '@/lib/perfCollector';

/**
 * צעד 2: Hook שמבצע את קריאת הנתונים עפ"י מצב הפילטרים.
 * מטרות:
 * 1. הפשטה – קומפוננטת התצוגה לא צריכה לדעת על fetch.
 * 2. ניהול מצבים: loading / error / data / meta.
 * 3. מניעת מירוץ (Race) – שימוש ב-AbortController.
 * 4. Debounce לשינויי פילטר מהירים (למשל הקלדה) – כאן 250ms.
 */
interface ErrorPayload {
  message: string;
  status?: number;
}

interface UseFilteredProductsResult {
  products: Product[];
  meta: {
    total: number;
    filtered: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  loading: boolean;
  refreshing: boolean; // דגל לריענון רקע כשיש כבר מוצרים מוצגים
  error: ErrorPayload | null;
  refetch: () => void; // אפשרות טעינה מחדש יזומה
}

// קבוע דיבאונס חדש – מרחיב את חלון ההמתנה כך שמספר פעולות רצופות יתאגדו
const DEBOUNCE_MS = 450;

// פונקציה עזר להשוואת מערכים של מחרוזות (IDs של קטגוריות)
const areStringArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

// פונקציה שמייצרת עותק מוגן של הפילטרים לשמירה ב-ref (כדי להימנע מאיבוד השוואה)
const cloneFilters = (source: FiltersState): FiltersState => ({
  ...source,
  price: { ...source.price },
  categoryIds: [...source.categoryIds],
  attributes: { ...source.attributes }, // שכפול מאפיינים דינמיים
});

export function useFilteredProducts(filters: FiltersState): UseFilteredProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<UseFilteredProductsResult['meta']>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // דגל ריענון רקע כאשר יש כבר מוצרים
  const [error, setError] = useState<UseFilteredProductsResult['error']>(null);
  // מזהה רציף לקריאות fetch כדי לדחות תשובות ישנות ולא לעדכן state מתשובות שמאוחרות
  const requestIdRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const lastFetchArgsRef = useRef<{ q: string } | null>(null);
  const previousFiltersRef = useRef<FiltersState | null>(null);

  const runFetch = async (invalidateCache: boolean = false) => {
    // דיבאג קצר לזיהוי טריגרים של fetch בזמן ריצת האבחון
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[useFilteredProducts] runFetch start', {
        ts: Date.now(),
        invalidateCache,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sort,
        price: filters.price,
        categoryIds: filters.categoryIds,
        productsCount: products.length,
      });
    }
    // בניית פרמטרים לשרת (התאמה בין שמות מיון בצד לקוח למחרוזות שהשרת מצפה להן):
    let sortParam: string | undefined;
    switch (filters.sort) {
      case 'priceAsc': sortParam = 'price_asc'; break;
      case 'priceDesc': sortParam = 'price_desc'; break;
      case 'popular': sortParam = 'views_desc'; break; // בשלב זה נבחר views_desc כפרוקסי ל'פופולרי'
      case 'recent':
      default: sortParam = 'date_desc';
    }

    const q = buildQuery(filters); // שמור לעתיד (סנכרון URL / לוג דיאגנוסטי)
    lastFetchArgsRef.current = { q };
    // סימון נקודת התחלה למדידת ביצועים עבור ה-fetch הנוכחי
    const perfId = `filteredFetch:${Date.now()}:${filters.page}`;
    try {
      performance.mark(`${perfId}:start`);
    } catch (e) {
      // performance marcado may not be available in some test envs - ignore
    }
    // זיהוי הקריאה הנוכחית - רק התשובה המתאימה לזיהוי זה תעדכן state
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    // הפרדה בין טעינה ראשונית (אין מוצרים) לריענון רקע (יש מוצרים)
    if (products.length === 0) {
      setLoading(true);
      setRefreshing(false);
    } else {
      setLoading(false);
      setRefreshing(true);
    }
    setError(null);

    // חילוץ priceMin/priceMax מהסטייט (כי השרת מקבל אותם כפרמטרים נפרדים)
    const params: FilteredProductsRequestParams = {
      page: filters.page,
      pageSize: filters.pageSize,
      sort: sortParam,
    };
    if (filters.price.min != null) params.priceMin = filters.price.min;
    if (filters.price.max != null) params.priceMax = filters.price.max;
    if (filters.categoryIds && filters.categoryIds.length > 0) params.categoryIds = filters.categoryIds;

    // הוספת מאפיינים דינמיים (צבע, גודל, חומר וכו') כ-object מאורגן
    if (filters.attributes && Object.keys(filters.attributes).length > 0) {
      const attributeEntries = Object.entries(filters.attributes).filter(([, values]) => values && values.length > 0);
      if (attributeEntries.length > 0) {
        params.attributes = attributeEntries.reduce<Record<string, string[]>>((acc, [key, values]) => {
          acc[key] = [...values];
          return acc;
        }, {});
      }
    }

    if (invalidateCache) {
      // ניקוי מטמון קיים עבור אותו פילטר כדי להבטיח רענון מלא מהשרת
      ProductService.invalidateFilteredProductsCache(params);
    }

    try {
      const result = await ProductService.getFilteredProducts(params);
      // אם במהלך הזמן מאז שלחנו את הבקשה נשלחה בקשה חדשה יותר, נדלג על העדכון
      if (currentRequestId !== requestIdRef.current) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[useFilteredProducts] ignoring stale response', { requestId: currentRequestId, current: requestIdRef.current });
        }
      } else {
        setProducts(result.data);
        setMeta(result.meta);

        if (result.meta?.hasNext) {
          const nextPage = result.meta.page + 1;
          // הקדמת טעינת עמוד הבא בזמן שהמשתמש נשאר בעמוד הנוכחי
          ProductService.prefetchFilteredProducts({
            ...params,
            page: nextPage,
          });
        }
      }
    } catch (err) {
      const name = (err as { name?: string } | undefined)?.name;
      // במקרה של AbortError - לא נשבור את הזרימה כאן כדי שה-finally ירוץ וינקה מצבים (loading/refreshing)
      if (name === 'AbortError') {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[useFilteredProducts] fetch aborted', { ts: Date.now(), page: filters.page });
        }
      } else {
        console.error('Filter fetch error:', err);
        if (err instanceof ApiError) {
          setError({ message: err.message || 'שגיאה בטעינת מוצרים', status: err.status });
        } else {
          setError({ message: (err instanceof Error ? err.message : String(err)) || 'שגיאה בטעינת מוצרים' });
        }
      }
      // שאר הטיפול ב־catch מתבצע למטה ב-finally באמצעות collectPerfMeasure
    } finally {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[useFilteredProducts] runFetch end', { ts: Date.now(), page: params.page, productsNow: products.length });
      }
      try {
        // שלח/אגר את המדידה לכל fetch (הצלחה/כשל) – לא נחסום שגיאות הצטרפות
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await collectPerfMeasure(perfId, {
          page: params.page,
          pageSize: params.pageSize,
          query: lastFetchArgsRef.current?.q,
        });
      } catch (e) {
        // מתעלמים מכשלים באיסוף מדידות – לא אמורים לעצור את הזרימה
      }

      setLoading(false);
      setRefreshing(false);
    }
  };

  // טריגר כש-filters / page / pageSize משתנים
  useEffect(() => {
    const previous = previousFiltersRef.current;
    const cloned = cloneFilters(filters);

    // אם זו הריצה הראשונה – נטען מיד ללא דיבאונס
    if (!previous) {
      previousFiltersRef.current = cloned;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
  runFetch();
      return () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
      };
    }

    const sameSort = previous.sort === filters.sort;
    const samePrice = previous.price.min === filters.price.min && previous.price.max === filters.price.max;
    const sameCategories = areStringArraysEqual(previous.categoryIds, filters.categoryIds);
    const paginationChangedOnly = sameSort && samePrice && sameCategories && (
      previous.page !== filters.page || previous.pageSize !== filters.pageSize
    );

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (paginationChangedOnly) {
      // שינוי עמוד/גודל עמוד – לא מבזבזים זמן בדיבאונס כדי להשיב תגובה מהירה
      previousFiltersRef.current = cloned;
      runFetch(true);
    } else {
      // שינויים מהותיים אחרים – נמתין מעט כדי לאגד רצף פעולות
      previousFiltersRef.current = cloned;
      debounceRef.current = window.setTimeout(() => {
        runFetch(true);
      }, DEBOUNCE_MS);
    }

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // פונקציית refetch ידנית (ללא דיבאונס)
  const refetch = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    runFetch();
  };

  return { products, meta, loading, error, refetch, refreshing };
}

/**
 * הערות:
 * - כרגע אין ניהול page חיצוני כאן; העמוד מתקבל כפרמטר. אפשר בעתיד לספק setter ולנהל בפנים.
 * - התמיכה במיון 'popular' ממפה ל-views_desc (פשוט וזמין כבר עכשיו בשרת).
 * - כשנוסיף עוד פילטרים (צבעים, קטגוריות) פשוט נוסיף אותם ל-params.
 */
