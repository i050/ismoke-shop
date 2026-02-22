import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const LAZY_RETRY_KEY = 'lazy-import-retry-once';

// מזהה שגיאות טעינה שמאפיינות קבצי chunk ישנים אחרי דיפלוי חדש
const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('failed to fetch dynamically imported module') ||
    normalizedMessage.includes('importing a module script failed') ||
    normalizedMessage.includes('loading chunk') ||
    normalizedMessage.includes('chunkloaderror')
  );
};

// עוטף dynamic import עם רענון חד-פעמי כדי לטעון את ה-bundle העדכני
export const lazyWithRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
  return lazy(async () => {
    try {
      const module = await importFn();

      // אם טעינה הצליחה, מאפסים דגל ניסיון רענון קודם
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LAZY_RETRY_KEY);
      }

      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const hasRetried = sessionStorage.getItem(LAZY_RETRY_KEY) === '1';

        // ניסיון רענון אחד בלבד כדי למנוע לולאת refresh אינסופית
        if (!hasRetried) {
          sessionStorage.setItem(LAZY_RETRY_KEY, '1');
          window.location.reload();

          // עוצרים את ה-render הנוכחי עד שהרענון יחליף את הדף
          return new Promise<never>(() => undefined);
        }
      }

      throw error;
    }
  });
};
