import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface ProductsRealtimeProviderProps {
  /** ילדים שיקבלו את ההקשר של עדכוני realtime */
  children: React.ReactNode;
  /** קריאה חוזרת בעת הורדת אירוע socket רלוונטי (למשל refetch) */
  onGroupUpdate?: () => void;
  /** מרווח חסימה בין אירועים כדי למנוע עומס */
  throttleMs?: number;
}

interface ProductsRealtimeContextValue {
  /** חותמת הזמן של אירוע groupUpdated האחרון לאחר פילטר throttle */
  lastGroupUpdateAt: number | null;
}

const ProductsRealtimeContext = createContext<ProductsRealtimeContextValue>({
  lastGroupUpdateAt: null,
});

export const useProductsRealtimeContext = (): ProductsRealtimeContextValue => {
  return useContext(ProductsRealtimeContext);
};

export const ProductsRealtimeProvider: React.FC<ProductsRealtimeProviderProps> = ({
  children,
  onGroupUpdate,
  throttleMs = 1500,
}) => {
  // שמירת חותמת זמן עבור המאורע האחרון לצורך הפצת state לילדים
  const [lastGroupUpdateAt, setLastGroupUpdateAt] = useState<number | null>(null);
  // ref לשמירת זמן הטיפול הקודם לצורך throttle שלא תלוי ב-render
  const lastHandledAtRef = useRef<number>(0);

  // האזנה ל-socket עם טיפול בתדירות גבוהה – נעצור אירועים צפופים מדי
  const handleGroupUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastHandledAtRef.current < throttleMs) {
      return;
    }

    lastHandledAtRef.current = now;
    setLastGroupUpdateAt(now);
    onGroupUpdate?.();
  }, [onGroupUpdate, throttleMs]);

  useSocket('groupUpdated', handleGroupUpdate);

  const value = useMemo<ProductsRealtimeContextValue>(() => ({
    lastGroupUpdateAt,
  }), [lastGroupUpdateAt]);

  return (
    <ProductsRealtimeContext.Provider value={value}>
      {children}
    </ProductsRealtimeContext.Provider>
  );
};
