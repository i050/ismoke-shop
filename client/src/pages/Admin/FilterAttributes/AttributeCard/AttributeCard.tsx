import React from 'react';
import type { FilterAttribute } from '../../../../services/filterAttributeService';
import { Button, Icon } from '../../../../components/ui';
import styles from './AttributeCard.module.css';

/**
 * Props של קומפוננטת AttributeCard
 */
interface AttributeCardProps {
  attribute: FilterAttribute;
  onEdit: (attribute: FilterAttribute) => void;
  onDelete: (attribute: FilterAttribute) => void;
}

/**
 * AttributeCard - כרטיס להצגת מאפיין סינון בודד
 * מציג את פרטי המאפיין ומאפשר עריכה ומחיקה
 */
const AttributeCard: React.FC<AttributeCardProps> = ({
  attribute,
  onEdit,
  onDelete,
}) => {
  /**
   * קביעת אייקון לפי סוג המאפיין
   */
  const getTypeIcon = () => {
    switch (attribute.valueType) {
      case 'color':
        return 'Palette';
      case 'number':
        return 'BarChart3';
      case 'text':
      default:
        return 'List';
    }
  };

  /**
   * קביעת טקסט סוג המאפיין בעברית
   */
  const getTypeText = () => {
    switch (attribute.valueType) {
      case 'color':
        return 'צבעים';
      case 'number':
        return 'מספרי';
      case 'text':
      default:
        return 'טקסט';
    }
  };

  /**
   * ספירת ערכים במאפיין
   */
  const getValuesCount = () => {
    if (attribute.valueType === 'color' && attribute.colorFamilies) {
      return attribute.colorFamilies.length;
    }
    if (attribute.values) {
      return attribute.values.length;
    }
    return 0;
  };

  /**
   * בדיקה האם זה מאפיין צבע מערכתי (מוגן ממחיקה/עריכה)
   */
  const isColorAttribute = attribute.key === 'color' && attribute.valueType === 'color';

  return (
    <div className={styles.card}>
      {/* כותרת הכרטיס */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          {/* אייקון המאפיין */}
          {attribute.icon && (
            <span className={styles.emoji} role="img" aria-label={attribute.name}>
              {attribute.icon}
            </span>
          )}
          {/* שם המאפיין */}
          <h3 className={styles.title}>{attribute.name}</h3>
        </div>
        
        {/* תגיות סטטוס */}
        <div className={styles.badges}>
          {attribute.showInFilter && (
            <span className={styles.badge} data-type="filter">
              <Icon name="Filter" size={14} />
              מוצג בסינון
            </span>
          )}
          {attribute.isRequired && (
            <span className={styles.badge} data-type="required">
              <Icon name="AlertCircle" size={14} />
              נדרש
            </span>
          )}
        </div>
      </div>

      {/* תוכן הכרטיס */}
      <div className={styles.content}>
        {/* מידע על המאפיין */}
        <div className={styles.info}>
          <div className={styles.infoItem}>
            <Icon name={getTypeIcon()} size={16} className={styles.infoIcon} />
            <span className={styles.infoLabel}>סוג:</span>
            <span className={styles.infoValue}>{getTypeText()}</span>
          </div>

          <div className={styles.infoItem}>
            <Icon name="Key" size={16} className={styles.infoIcon} />
            <span className={styles.infoLabel}>מזהה:</span>
            <span className={styles.infoValue}>{attribute.key}</span>
          </div>

          <div className={styles.infoItem}>
            <Icon name="Database" size={16} className={styles.infoIcon} />
            <span className={styles.infoLabel}>ערכים:</span>
            <span className={styles.infoValue}>{getValuesCount()}</span>
          </div>

          <div className={styles.infoItem}>
            <Icon name="Target" size={16} className={styles.infoIcon} />
            <span className={styles.infoLabel}>סדר תצוגה:</span>
            <span className={styles.infoValue}>{attribute.sortOrder}</span>
          </div>
        </div>

        {/* תצוגה מקדימה של ערכים (לצבעים) */}
        {attribute.valueType === 'color' && attribute.colorFamilies && (
          <div className={styles.preview}>
            <span className={styles.previewLabel}>משפחות צבעים:</span>
            <div className={styles.colorFamilies}>
              {attribute.colorFamilies.slice(0, 5).map((family) => (
                <div
                  key={family.family}
                  className={styles.colorFamily}
                  title={family.displayName}
                >
                  <span className={styles.familyName}>{family.displayName}</span>
                  <span className={styles.variantCount}>
                    ({family.variants.length} גוונים)
                  </span>
                </div>
              ))}
              {attribute.colorFamilies.length > 5 && (
                <span className={styles.moreIndicator}>
                  +{attribute.colorFamilies.length - 5} נוספים
                </span>
              )}
            </div>
          </div>
        )}

        {/* תצוגה מקדימה של ערכים (לטקסט/מספרים) */}
        {attribute.valueType !== 'color' && attribute.values && attribute.values.length > 0 && (
          <div className={styles.preview}>
            <span className={styles.previewLabel}>ערכים:</span>
            <div className={styles.valuesList}>
              {attribute.values.slice(0, 5).map((val) => (
                <span key={val.value} className={styles.valueChip}>
                  {val.displayName}
                </span>
              ))}
              {attribute.values.length > 5 && (
                <span className={styles.moreIndicator}>
                  +{attribute.values.length - 5} נוספים
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* כפתורי פעולה */}
      <div className={styles.actions}>
        {isColorAttribute ? (
          /* מאפיין צבע מערכתי - מוגן ממחיקה ועריכה */
          <div className={styles.protectedBadge}>
            <Icon name="Lock" size={16} />
            <span>מאפיין מערכת מוגן</span>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="Edit" size={16} />}
              onClick={() => onEdit(attribute)}
              aria-label={`ערוך ${attribute.name}`}
            >
              עריכה
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Icon name="Trash2" size={16} />}
              onClick={() => onDelete(attribute)}
              aria-label={`מחק ${attribute.name}`}
            >
              מחיקה
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AttributeCard;
