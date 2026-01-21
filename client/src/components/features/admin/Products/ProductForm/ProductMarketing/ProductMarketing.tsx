/**
 * ProductMarketing Component
 * מטרת הקומפוננטה: ניהול הגדרות שיווק ומבצעים של המוצר
 * כולל: מוצר חדש, מוצר מומלץ, רב מכר, תגיות קידום
 */

import React, { useState, useCallback } from 'react';
import { Icon } from '../../../../../ui/Icon';
import styles from './ProductMarketing.module.css';

// ==========================================
// טיפוסים
// ==========================================

export interface ProductMarketingValues {
  /** האם המוצר מסומן כ"חדש" */
  isNew: boolean;
  /** האם המוצר מסומן כ"מומלץ" */
  isFeatured: boolean;
  /** האם המוצר מסומן כ"רב מכר" */
  isBestSeller: boolean;
  /** תגיות קידום מותאמות אישית */
  promotionTags: string[];
}

interface ProductMarketingProps {
  /** האם המוצר מסומן כ"חדש" */
  isNew?: boolean;
  /** האם המוצר מסומן כ"מומלץ" */
  isFeatured?: boolean;
  /** האם המוצר מסומן כ"רב מכר" */
  isBestSeller?: boolean;
  /** תגיות קידום מותאמות אישית */
  promotionTags?: string[];
  /** שגיאות validation */
  errors?: {
    isNew?: string;
    isFeatured?: string;
    isBestSeller?: string;
    promotionTags?: string;
  };
  /** פונקציה לשינוי ערכים */
  onChange: (field: keyof ProductMarketingValues, value: boolean | string[]) => void;
  /** מספר מקסימלי של תגיות */
  maxTags?: number;
  /** האם הטופס במצב loading */
  disabled?: boolean;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductMarketing: React.FC<ProductMarketingProps> = ({
  isNew = false,
  isFeatured = false,
  isBestSeller = false,
  promotionTags = [],
  errors = {},
  onChange,
  maxTags = 10,
  disabled = false,
}) => {
  // State לשדה הוספת תגית
  const [tagInput, setTagInput] = useState('');

  // ===== Handlers =====

  const handleToggle = useCallback((field: 'isNew' | 'isFeatured' | 'isBestSeller') => {
    if (disabled) return;
    const currentValue = field === 'isNew' ? isNew : field === 'isFeatured' ? isFeatured : isBestSeller;
    onChange(field, !currentValue);
  }, [isNew, isFeatured, isBestSeller, onChange, disabled]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    
    if (!trimmedTag) return;
    
    if (trimmedTag.length < 2) {
      return;
    }

    if (trimmedTag.length > 30) {
      return;
    }

    if (promotionTags.includes(trimmedTag)) {
      return;
    }

    if (promotionTags.length >= maxTags) {
      return;
    }

    onChange('promotionTags', [...promotionTags, trimmedTag]);
    setTagInput('');
  }, [tagInput, promotionTags, maxTags, onChange]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    if (disabled) return;
    onChange('promotionTags', promotionTags.filter(tag => tag !== tagToRemove));
  }, [promotionTags, onChange, disabled]);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  // ===== כרטיסי הבחירה =====

  const marketingCards = [
    {
      id: 'isNew' as const,
      icon: 'Sparkles',
      emoji: '🆕',
      title: 'מוצר חדש',
      description: 'יוצג עם תג "חדש" בחנות',
      checked: isNew,
      color: 'blue',
    },
    {
      id: 'isFeatured' as const,
      icon: 'Star',
      emoji: '⭐',
      title: 'מוצר מומלץ',
      description: 'יוצג ברשימת המומלצים',
      checked: isFeatured,
      color: 'yellow',
    },
    {
      id: 'isBestSeller' as const,
      icon: 'Flame',
      emoji: '🔥',
      title: 'רב מכר',
      description: 'יוצג עם תג "רב מכר"',
      checked: isBestSeller,
      color: 'red',
    },
  ];

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Icon name="Target" size={24} />
        </div>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>שיווק ומבצעים</h3>
          <p className={styles.subtitle}>
            הגדר תגיות שיווקיות ומבצעים להגברת המכירות
          </p>
        </div>
      </div>

      {/* כרטיסי בחירה */}
      <div className={styles.cards}>
        {marketingCards.map((card) => (
          <label
            key={card.id}
            className={`
              ${styles.card} 
              ${card.checked ? styles.cardChecked : ''} 
              ${styles[`card${card.color.charAt(0).toUpperCase() + card.color.slice(1)}`]}
              ${disabled ? styles.cardDisabled : ''}
            `}
          >
            <input
              type="checkbox"
              checked={card.checked}
              onChange={() => handleToggle(card.id)}
              disabled={disabled}
              className={styles.hiddenCheckbox}
            />
            <div className={styles.cardContent}>
              <span className={styles.cardEmoji}>{card.emoji}</span>
              <div className={styles.cardText}>
                <span className={styles.cardTitle}>{card.title}</span>
                <span className={styles.cardDescription}>{card.description}</span>
              </div>
              <div className={styles.cardCheckbox}>
                {card.checked ? (
                  <Icon name="CheckCircle" size={24} />
                ) : (
                  <div className={styles.emptyCheckbox} />
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* תגיות קידום */}
      <div className={styles.tagsSection}>
        <label className={styles.tagsLabel}>
          תגיות קידום מותאמות אישית
        </label>
        <div className={styles.tagsInputWrapper}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="הוסף תגית (לדוגמה: מבצע השבוע)"
            disabled={disabled || promotionTags.length >= maxTags}
            className={styles.tagsInput}
            maxLength={30}
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={disabled || !tagInput.trim() || promotionTags.length >= maxTags}
            className={styles.addTagButton}
          >
            <Icon name="Plus" size={18} />
          </button>
        </div>

        {/* תגיות קיימות */}
        {promotionTags.length > 0 && (
          <div className={styles.tagsList}>
            {promotionTags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={disabled}
                  className={styles.removeTagButton}
                  aria-label={`הסר תגית ${tag}`}
                >
                  <Icon name="X" size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* מונה תגיות */}
        <div className={styles.tagsCounter}>
          {promotionTags.length}/{maxTags} תגיות
        </div>

        {errors.promotionTags && (
          <span className={styles.errorText}>{errors.promotionTags}</span>
        )}
      </div>

      {/* טיפים */}
      <div className={styles.tips}>
        <div className={styles.tipIcon}>💡</div>
        <div className={styles.tipContent}>
          <strong>טיפים לשיווק יעיל:</strong>
          <ul>
            <li>סמן כ"מוצר חדש" רק למוצרים שנוספו לאחרונה</li>
            <li>בחר מוצרים מומלצים בקפידה - פחות זה יותר</li>
            <li>השתמש בתגיות קידום לקמפיינים ספציפיים</li>
            <li>עדכן את התגיות לפי עונות ומבצעים</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductMarketing;
