// useFiltersState
// Hook פנימי לניהול מצב הפילטרים (שלב התחלתי מינימלי)
// כרגע: price + sort בלבד. נרחיב בהמשך.
import { useReducer, useCallback, useMemo } from 'react';
import { defaultFiltersState, type FiltersState, type SortKey } from '../types/filters';
import { buildCategoryDescendantsMap, getDescendantsFromMap } from '@/services/categoryHierarchyService';
import { useAppSelector } from '../../../../hooks/reduxHooks';
import { selectCategoriesTree } from '../../../../store/slices/categoriesSlice';

// פעולות אפשריות (Actions) – כולל גם מאפיינים דינמיים
export type FiltersAction =
  { type: 'SET_SORT'; sort: SortKey }
  | { type: 'SET_PRICE_MIN'; value: number | null }
  | { type: 'SET_PRICE_MAX'; value: number | null }
  | { type: 'SET_CATEGORY_IDS'; categoryIds: string[] }
  | { type: 'TOGGLE_ATTRIBUTE'; attributeKey: string; value: string }
  | { type: 'CLEAR_ATTRIBUTE'; attributeKey: string }
  | { type: 'CLEAR_ALL_ATTRIBUTES' }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_PAGE_SIZE'; pageSize: number }
  | { type: 'RESET' };

function reducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'SET_SORT':
      return { ...state, sort: action.sort };
    case 'SET_PRICE_MIN':
      return { ...state, price: { ...state.price, min: action.value } };
    case 'SET_PRICE_MAX':
      return { ...state, price: { ...state.price, max: action.value } };
    case 'SET_CATEGORY_IDS':
      return { ...state, categoryIds: action.categoryIds };
    
    // ניהול מאפיינים דינמיים - הוספה/הסרה של ערך במאפיין
    case 'TOGGLE_ATTRIBUTE': {
      const currentValues = state.attributes[action.attributeKey] || [];
      const exists = currentValues.includes(action.value);
      const newValues = exists
        ? currentValues.filter(v => v !== action.value) // הסרת ערך
        : [...currentValues, action.value]; // הוספת ערך

      // אם אין ערכים במאפיין - נמחק אותו מה-object
      const newAttributes = { ...state.attributes };
      if (newValues.length === 0) {
        delete newAttributes[action.attributeKey];
      } else {
        newAttributes[action.attributeKey] = newValues;
      }
      return { ...state, attributes: newAttributes, page: 1 }; // איפוס עמוד בשינוי סינון
    }
    
    // ניקוי כל הערכים של מאפיין מסוים
    case 'CLEAR_ATTRIBUTE': {
      const newAttributes = { ...state.attributes };
      delete newAttributes[action.attributeKey];
      return { ...state, attributes: newAttributes, page: 1 };
    }
    
    // ניקוי כל המאפיינים
    case 'CLEAR_ALL_ATTRIBUTES':
      return { ...state, attributes: {}, page: 1 };
    
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.pageSize, page: 1 };
    case 'RESET':
      return defaultFiltersState;
    default:
      return state;
  }
}

export function useFiltersState(initial: FiltersState = defaultFiltersState) {
  const [state, dispatch] = useReducer(reducer, initial);

  // קריאת עץ הקטגוריות מה-Redux עבור פעולות בחירה
  const categoriesTree = useAppSelector(selectCategoriesTree);

  // בניית מפת צאצאים מזוהה פעם אחת לכל שינוי בעץ הקטגוריות
  const descendantsMap = useMemo(() => buildCategoryDescendantsMap(categoriesTree), [categoriesTree]);

  // Small helpers for the component API
  const setSort = useCallback(
    (sort: SortKey) => dispatch({ type: 'SET_SORT', sort }),
    [dispatch]
  );

  const setPriceMin = useCallback(
    (value: number | null) => dispatch({ type: 'SET_PRICE_MIN', value }),
    [dispatch]
  );

  const setPriceMax = useCallback(
    (value: number | null) => dispatch({ type: 'SET_PRICE_MAX', value }),
    [dispatch]
  );

  const setCategoryIds = useCallback(
    (categoryIds: string[]) => dispatch({ type: 'SET_CATEGORY_IDS', categoryIds }),
    [dispatch]
  );

  const toggleCategory = useCallback(
    (categoryId: string) => {
      if (categoryId === '') {
        dispatch({ type: 'SET_CATEGORY_IDS', categoryIds: [] });
        return;
      }

      const allDescendants = getDescendantsFromMap(descendantsMap, categoryId);
      const currentIds = state.categoryIds;
      const exists = currentIds.includes(categoryId);
      const newIds = exists
        ? currentIds.filter((id) => id !== categoryId && !allDescendants.includes(id))
        : Array.from(new Set([...currentIds, categoryId, ...allDescendants]));

      dispatch({ type: 'SET_CATEGORY_IDS', categoryIds: newIds });
    },
    [descendantsMap, state.categoryIds, dispatch]
  );

  const replaceCategory = useCallback(
    (categoryId: string) => {
      const allDescendants = getDescendantsFromMap(descendantsMap, categoryId);
      dispatch({ type: 'SET_CATEGORY_IDS', categoryIds: [categoryId, ...allDescendants] });
    },
    [descendantsMap, dispatch]
  );

  const setPage = useCallback((page: number) => dispatch({ type: 'SET_PAGE', page }), [dispatch]);
  const setPageSize = useCallback((pageSize: number) => dispatch({ type: 'SET_PAGE_SIZE', pageSize }), [dispatch]);
  
  // פונקציות לניהול מאפיינים דינמיים
  const toggleAttribute = useCallback(
    (attributeKey: string, value: string) => {
      dispatch({ type: 'TOGGLE_ATTRIBUTE', attributeKey, value });
    },
    [dispatch]
  );

  const clearAttribute = useCallback(
    (attributeKey: string) => {
      dispatch({ type: 'CLEAR_ATTRIBUTE', attributeKey });
    },
    [dispatch]
  );

  const clearAllAttributes = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ATTRIBUTES' });
  }, [dispatch]);
  
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  return {
    state,
    setSort,
    setPriceMin,
    setPriceMax,
    setCategoryIds,
    toggleCategory,
    replaceCategory,
    toggleAttribute,
    clearAttribute,
    clearAllAttributes,
    setPage,
    setPageSize,
    reset,
  };
}
