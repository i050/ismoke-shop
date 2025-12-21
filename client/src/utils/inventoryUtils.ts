/**
 * פונקציות עזר לניהול מלאי
 * מטרה: חישובים וסטטוסים של מלאי לפי SKUs
 */

export interface SkuStockInfo {
  sku: string;
  name: string;
  stockQuantity: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  statusIcon: string;
  statusLabel: string;
  statusColor: string;
}

/**
 * חישוב סה"כ מלאי מכל SKUs
 */
export const calculateTotalStock = (skus: Array<{ stockQuantity?: number | null }>): number => {
  return skus.reduce((sum, sku) => sum + (sku.stockQuantity || 0), 0);
};

/**
 * קבלת סטטוס מלאי לפי כמות ורף אזהרה
 */
export const getStockStatus = (
  stock: number,
  threshold: number
): 'in-stock' | 'low-stock' | 'out-of-stock' => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= threshold) return 'low-stock';
  return 'in-stock';
};

/**
 * קבלת מידע סטטוס מלאי מלא (אייקון, טקסט, צבע)
 */
export const getStockStatusInfo = (
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
): { icon: string; label: string; color: string } => {
  switch (status) {
    case 'in-stock':
      return { icon: '✅', label: 'במלאי', color: 'success' };
    case 'low-stock':
      return { icon: '⚠️', label: 'מלאי נמוך', color: 'warning' };
    case 'out-of-stock':
      return { icon: '❌', label: 'אזל', color: 'error' };
  }
};

/**
 * קבלת מידע מפורט על כל SKU כולל סטטוס
 */
export const getSkuStockInfo = (
  skus: Array<{ sku: string; name: string; stockQuantity: number }>,
  threshold: number
): SkuStockInfo[] => {
  return skus.map((sku) => {
    const status = getStockStatus(sku.stockQuantity, threshold);
    const statusInfo = getStockStatusInfo(status);

    return {
      sku: sku.sku,
      name: sku.name,
      stockQuantity: sku.stockQuantity,
      status,
      statusIcon: statusInfo.icon,
      statusLabel: statusInfo.label,
      statusColor: statusInfo.color,
    };
  });
};

/**
 * קבלת SKUs שנמצאים במלאי נמוך
 */
export const getLowStockSkus = (
  skus: Array<{ stockQuantity: number }>,
  threshold: number
): Array<{ stockQuantity: number }> => {
  return skus.filter(
    (sku) => sku.stockQuantity > 0 && sku.stockQuantity <= threshold
  );
};

/**
 * קבלת SKUs שאזלו
 */
export const getOutOfStockSkus = (
  skus: Array<{ stockQuantity: number }>
): Array<{ stockQuantity: number }> => {
  return skus.filter((sku) => sku.stockQuantity === 0);
};

/**
 * קבלת סיכום מלאי
 */
export const getInventorySummary = (
  skus: Array<{ stockQuantity: number }>,
  threshold: number
): {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
} => {
  const total = calculateTotalStock(skus);
  const lowStockSkus = getLowStockSkus(skus, threshold);
  const outOfStockSkus = getOutOfStockSkus(skus);
  const inStockSkus = skus.filter(
    (sku) => sku.stockQuantity > threshold
  );

  return {
    total,
    inStock: inStockSkus.length,
    lowStock: lowStockSkus.length,
    outOfStock: outOfStockSkus.length,
  };
};
