/**
 * 🏷️ BrandCard Component
 * 
 * כרטיס להצגת מותג ברשימת ניהול המותגים
 * כולל: שם, סטטוס, כפתורי עריכה/מחיקה
 */

import React from 'react';
import { Icon, Button } from '../../../../components/ui';
import type { Brand } from '../../../../services/brandService';
import styles from './BrandCard.module.css';

interface BrandCardProps {
  brand: Brand;
  onEdit: () => void;
  onDelete: () => void;
}

const BrandCard: React.FC<BrandCardProps> = ({ brand, onEdit, onDelete }) => {
  return (
    <div className={styles.card}>
      {/* תוכן הכרטיס */}
      <div className={styles.content}>
        {/* אייקון */}
        <div className={styles.icon}>
          <Icon name="Award" size={22} />
        </div>
        
        {/* מידע */}
        <div className={styles.info}>
          <h4 className={styles.name}>{brand.name}</h4>
          <div className={styles.meta}>
            <span 
              className={`${styles.status} ${brand.isActive ? styles.statusActive : styles.statusInactive}`}
            >
              {brand.isActive ? '✓ פעיל' : '⏸ לא פעיל'}
            </span>
          </div>
        </div>
      </div>
      
      {/* כפתורי פעולה */}
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          icon={<Icon name="Edit" size={16} />}
          onClick={onEdit}
          aria-label={`ערוך ${brand.name}`}
        >
          עריכה
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<Icon name="Trash2" size={16} />}
          onClick={onDelete}
          aria-label={`מחק ${brand.name}`}
        >
          מחיקה
        </Button>
      </div>
    </div>
  );
};

export default BrandCard;
