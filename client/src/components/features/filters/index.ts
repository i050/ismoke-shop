// קובץ אינדקס מודול filters
// המטרה: נקודת כניסה אחת לייצוא רכיבים / hooks / לוגיקה של הסינון.
// למה? כדי שייבוא מבחוץ יהיה קצר וברור: import { FilterPanel } from '@/features/filters'
// בהמשך נרחיב כאן עם ייצוא של buildQuery, parseQuery, hooks וכו'.
// מבנה חדש לאחר ארגון: panel/, results/, container/, mobile/
export { default as FilterPanel } from './panel/FilterPanel/FilterPanel';
export { default as FiltersContainer } from './container/FiltersContainer';
export { default as ProductsResults } from './results/ProductsResults';
export { useFiltersUrlSync, getInitialFiltersFromUrl } from './hooks/useFiltersUrlSync';
export * from './hooks/useFiltersState';
export * from './hooks/useFilteredProducts';

// Mobile filter components
export { 
  MobileFiltersToolbar, 
  MobileSortMenu, 
  MobileFilterDrawer, 
  FilterAccordion 
} from './mobile';
