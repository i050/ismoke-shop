import React, { useCallback } from 'react';
import { Input } from '../../../../../ui/Input';
import { Icon } from '../../../../../ui/Icon';
import styles from './ProductSortPositions.module.css';

interface ProductSortPositionsProps {
  values: {
    newSortPosition?: number | null;
    popularSortPosition?: number | null;
  };
  errors?: {
    newSortPosition?: { message?: string };
    popularSortPosition?: { message?: string };
  };
  onChange: (field: 'newSortPosition' | 'popularSortPosition', value: number | null) => void;
  disabled?: boolean;
}

const ProductSortPositions: React.FC<ProductSortPositionsProps> = ({
  values,
  errors,
  onChange,
  disabled = false,
}) => {
  const handleChange = useCallback((field: 'newSortPosition' | 'popularSortPosition') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = event.target.value;
    if (rawValue === '') {
      onChange(field, null);
      return;
    }

    const value = Number(rawValue);
    if (Number.isInteger(value) && value >= 1) {
      onChange(field, value);
    }
  }, [onChange]);

  return (
    <section className={styles.container} aria-labelledby="sort-positions-title">
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Icon name="ArrowUpDown" size={22} />
        </div>
        <div>
          <h3 id="sort-positions-title" className={styles.title}>מיקום במיונים</h3>
          <p className={styles.subtitle}>
            אופציונלי: השאר ריק כדי להשתמש במיון האוטומטי. בחירת מקום תפנה את המקום ותזיז את המוצרים שאחריו.
          </p>
        </div>
      </div>

      <div className={styles.positions}>
        <div className={styles.positionCard}>
          <div className={styles.cardHeader}>
            <Icon name="Clock" size={20} />
            <div>
              <h4>מיון לפי חדש</h4>
              <p>לדוגמה, 2 יציג את המוצר שני במיון “חדש”.</p>
            </div>
          </div>
          <Input
            id="new-sort-position"
            label="מיקום ידני"
            type="number"
            value={values.newSortPosition?.toString() || ''}
            onChange={handleChange('newSortPosition')}
            error={Boolean(errors?.newSortPosition)}
            helperText={errors?.newSortPosition?.message || 'השאר ריק למיון אוטומטי'}
            disabled={disabled}
            placeholder="ללא מיקום ידני"
          />
        </div>

        <div className={styles.positionCard}>
          <div className={styles.cardHeader}>
            <Icon name="TrendingUp" size={20} />
            <div>
              <h4>מיון לפי פופולרי</h4>
              <p>לדוגמה, 5 יציג את המוצר חמישי במיון “פופולרי”.</p>
            </div>
          </div>
          <Input
            id="popular-sort-position"
            label="מיקום ידני"
            type="number"
            value={values.popularSortPosition?.toString() || ''}
            onChange={handleChange('popularSortPosition')}
            error={Boolean(errors?.popularSortPosition)}
            helperText={errors?.popularSortPosition?.message || 'השאר ריק למיון אוטומטי'}
            disabled={disabled}
            placeholder="ללא מיקום ידני"
          />
        </div>
      </div>
    </section>
  );
};

export default ProductSortPositions;
