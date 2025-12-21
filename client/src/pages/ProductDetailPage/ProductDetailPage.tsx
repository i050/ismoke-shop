import React from 'react';
import { useParams } from 'react-router-dom';
import ProductDetail from '../../components/features/products/ProductDetail';
import { Icon } from '../../components/ui';
import { Typography } from '@ui';
import styles from './ProductDetailPage.module.css';

/**
 * עמוד פרטי מוצר - העמוד הראשי שמציג את כל המידע על המוצר
 * משתמש ברכיב ProductDetail עם props
 */
const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // אם אין id, לא מציגים כלום
  if (!id) {
    return (
      <div className={styles.errorContainer}>
        <Icon name="AlertCircle" size={48} className={styles.errorIcon} />
        <Typography variant="h2" align="center">מזהה מוצר חסר</Typography>
      </div>
    );
  }

  return <ProductDetail productId={id} />;
};

export default ProductDetailPage;
