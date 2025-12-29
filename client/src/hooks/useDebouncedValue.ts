import { useState, useEffect } from 'react';

/**
 * Hook לערך מושהה (debounce)
 * משמש למניעת קריאות API מרובות בזמן הקלדה
 * 
 * @param value - הערך המקורי שמשתנה בכל הקלדה
 * @param delay - זמן השהיה במילישניות (ברירת מחדל: 300ms)
 * @returns הערך המושהה - מתעדכן רק אחרי שהמשתמש הפסיק להקליד
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebouncedValue(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // קריאה ל-API תתבצע רק אחרי שהמשתמש הפסיק להקליד 300ms
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  // שמירת הערך המושהה ב-state
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // יצירת טיימר שמעדכן את הערך המושהה אחרי ה-delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // ניקוי הטיימר בכל שינוי - מבטל את העדכון הקודם
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedValue;
