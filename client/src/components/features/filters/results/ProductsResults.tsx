import React from 'react';
import styles from './ProductsResults.module.css';
import { Button } from '@/components/ui';
// ייבוא קומפוננטת ProductCard לתצוגת המוצרים
import ProductCard from '../../products/ProductCard/ProductCard';
import type { Product } from '../../../../types/Product';

interface Meta {
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ProductsResultsProps {
  products: Product[];
  meta: Meta | null;
  loading: boolean;
  error: { message: string; status?: number } | null;
  onRetry: () => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const ProductsResults: React.FC<ProductsResultsProps> = ({ products, meta, loading, error, onRetry, onPageChange, onPageSizeChange }) => {
  if (loading) return <div>טוען...</div>;
  if (error) return (
    <div className={styles.error}>
      {error.message}
      <Button variant="primary" size="sm" onClick={onRetry} className={styles.retryInline}>
        נסה שוב
      </Button>
    </div>
  );
  if (!loading && meta && meta.filtered === 0) return <div>לא נמצאו מוצרים.</div>;

  return (
    <div className={styles.wrapper}>
      {meta && (
        <div className={styles.meta}>
          {(() => {
            const start = (meta.page - 1) * meta.pageSize + 1;
            const end = Math.min(meta.page * meta.pageSize, meta.filtered);
            return `מוצג ${start}–${end} מתוך ${meta.filtered} מוצרים`;
          })()}
        </div>
      )}
      <div className={styles.list}>
        {products.map(p => (
          <ProductCard 
            key={p._id} 
            product={p}
            variant="grid"
          />
        ))}
      </div>
      {meta && (
        <div className={styles.pagination}>
          <div className={styles.pageInfo}>עמוד {meta.page} מתוך {meta.totalPages}</div>
          <div className={styles.pageControls}>
            <Button disabled={!meta.hasPrev} variant="ghost" size="sm" onClick={() => onPageChange && onPageChange(meta.page - 1)}>קודם</Button>
            <Button disabled={!meta.hasNext} variant="ghost" size="sm" onClick={() => onPageChange && onPageChange(meta.page + 1)}>הבא</Button>
            {onPageSizeChange && (
              <select aria-label="גודל דף" value={meta.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                {[10,20,30,50].map(s => <option key={s} value={s}>{s}/דף</option>)}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsResults;
