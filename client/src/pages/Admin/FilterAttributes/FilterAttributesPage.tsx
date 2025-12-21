import React, { useState, useEffect } from 'react';
import * as filterAttributeService from '../../../services/filterAttributeService';
import type { FilterAttribute } from '../../../services/filterAttributeService';
import { Button, Icon, TitleWithIcon } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import AttributeCard from './AttributeCard';
import AttributeModal from './AttributeModal';
import { DeleteAttributeModal } from './DeleteAttributeModal';
import styles from './FilterAttributesPage.module.css';

/**
 * עמוד ניהול מאפייני סינון
 * מאפשר למנהל ליצור, לערוך ולמחוק מאפיינים גלובליים
 * משתמש ב-useState + useEffect לניהול state (ללא Redux/React Query)
 */
const FilterAttributesPage: React.FC = () => {
  const { showToast } = useToast();
  
  // State management
  const [attributes, setAttributes] = useState<FilterAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<FilterAttribute | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FilterAttribute | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // טעינת מאפיינים בעת טעינת הדף
  useEffect(() => {
    loadAttributes();
  }, []);

  /**
   * טעינת כל המאפיינים מהשרת
   */
  const loadAttributes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await filterAttributeService.FilterAttributeService.getAllAttributes();
      setAttributes(data);
      console.log('✅ נטענו מאפיינים:', data.length);
    } catch (err: any) {
      console.error('❌ שגיאה בטעינת מאפיינים:', err);
      const errorMessage = err.message || 'שגיאה בטעינת המאפיינים';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * פתיחת מודאל ליצירת מאפיין חדש
   */
  const handleCreate = () => {
    setEditingAttribute(null);
    setShowModal(true);
  };

  /**
   * פתיחת מודאל לעריכת מאפיין קיים
   */
  const handleEdit = (attribute: FilterAttribute) => {
    setEditingAttribute(attribute);
    setShowModal(true);
  };

  /**
   * מחיקת מאפיין
   * פותח מודאל עם בדיקת שימוש וספירה לאחור
   */
  const handleDelete = async (id: string, name: string) => {
    // מציאת המאפיין המלא
    const attribute = attributes.find(attr => attr._id === id);
    if (!attribute) return;

    try {
      setIsDeleting(true);
      
      // בדיקת כמות השימוש מהשרת
      const { usageCount } = await filterAttributeService.FilterAttributeService.getAttributeUsage(id);
      
      // פתיחת מודאל המחיקה עם הנתונים
      setDeleteTarget(attribute);
      setDeleteUsageCount(usageCount);
      setShowDeleteModal(true);
    } catch (err: any) {
      console.error('❌ שגיאה בבדיקת שימוש:', err);
      showToast('error', 'שגיאה בבדיקת השימוש במאפיין');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * הסרת מאפיין מכל ה-SKUs ואז מחיקה
   */
  const handleRemoveFromAllAndDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsProcessingDelete(true);
      
      // הסרה מכל ה-SKUs
      const result = await filterAttributeService.FilterAttributeService.removeAttributeFromAllSkus(deleteTarget._id);
      console.log(`✅ המאפיין הוסר מ-${result.modifiedCount} מוצרים`);
      
      // מחיקת המאפיין
      await filterAttributeService.FilterAttributeService.deleteAttribute(deleteTarget._id);
      
      // עדכון ה-state המקומי
      setAttributes(prev => prev.filter(attr => attr._id !== deleteTarget._id));
      
      showToast('success', `המאפיין "${deleteTarget.name}" הוסר מכל המוצרים ונמחק בהצלחה`);
      console.log('✅ מאפיין נמחק:', deleteTarget.name);
      
      // סגירת המודאל
      handleCloseDeleteModal();
    } catch (err: any) {
      console.error('❌ שגיאה במחיקת מאפיין:', err);
      showToast('error', err.message || 'שגיאה במחיקת המאפיין');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  /**
   * מחיקה ישירה (כשאין שימוש במאפיין)
   */
  const handleDirectDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsProcessingDelete(true);
      
      await filterAttributeService.FilterAttributeService.deleteAttribute(deleteTarget._id);
      
      // עדכון ה-state המקומי
      setAttributes(prev => prev.filter(attr => attr._id !== deleteTarget._id));
      
      showToast('success', `המאפיין "${deleteTarget.name}" נמחק בהצלחה`);
      console.log('✅ מאפיין נמחק:', deleteTarget.name);
      
      // סגירת המודאל
      handleCloseDeleteModal();
    } catch (err: any) {
      console.error('❌ שגיאה במחיקת מאפיין:', err);
      showToast('error', err.message || 'שגיאה במחיקת המאפיין');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  /**
   * סגירת מודאל המחיקה
   */
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteUsageCount(0);
    setIsProcessingDelete(false);
  };

  /**
   * סגירת מודאל וטעינה מחדש של המאפיינים
   * נקרא אחרי שמירה מוצלחת במודאל
   */
  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingAttribute(null);
    loadAttributes(); // טעינה מחדש של כל המאפיינים
  };

  /**
   * סגירת מודאל ללא שמירה
   */
  const handleModalClose = () => {
    setShowModal(false);
    setEditingAttribute(null);
  };

  // מצב טעינה
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Icon name="Clock" size={48} />
          <p>טוען מאפייני סינון...</p>
        </div>
      </div>
    );
  }

  // מצב שגיאה
  if (error && attributes.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <Icon name="AlertCircle" size={48} />
          <h3>שגיאה בטעינת המאפיינים</h3>
          <p>{error}</p>
          <Button variant="primary" onClick={loadAttributes}>
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* כותרת ותיאור */}
      <div className={styles.header}>
        <TitleWithIcon icon="Filter" title="מאפייני סינון" />
        <p className={styles.subtitle}>
          ניהול מאפיינים גלובליים שלקוחות יכולים לסנן לפיהם בחנות
        </p>
      </div>

      {/* כפתור הוספת מאפיין */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={isDeleting}
        >
          <Icon name="Plus" size={18} />
          הוסף מאפיין חדש
        </Button>
        
        {attributes.length > 0 && (
          <div className={styles.statsInfo}>
            <Icon name="Filter" size={16} />
            <span>סה"כ {attributes.length} מאפיינים</span>
          </div>
        )}
      </div>

      {/* רשימת מאפיינים או מצב ריק */}
      {attributes && attributes.length > 0 ? (
        <div className={styles.grid}>
          {attributes.map((attr) => (
            <AttributeCard
              key={attr._id}
              attribute={attr}
              onEdit={() => handleEdit(attr)}
              onDelete={() => handleDelete(attr._id, attr.name)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Icon name="Package" size={64} />
          <h3>אין מאפייני סינון עדיין</h3>
          <p>
            צור מאפיינים כמו צבע, גודל, חומר וכו' שיוכלו להיות מסוננים בחנות
          </p>
          <Button variant="primary" onClick={handleCreate}>
            <Icon name="Plus" size={18} />
            צור מאפיין ראשון
          </Button>
        </div>
      )}

      {/* מודאל יצירה/עריכה */}
      {showModal && (
        <AttributeModal
          attribute={editingAttribute}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* מודאל מחיקה עם ספירה לאחור */}
      <DeleteAttributeModal
        isOpen={showDeleteModal}
        attribute={deleteTarget}
        usageCount={deleteUsageCount}
        isProcessing={isProcessingDelete}
        onClose={handleCloseDeleteModal}
        onRemoveFromAll={handleRemoveFromAllAndDelete}
        onDelete={handleDirectDelete}
      />
    </div>
  );
};

export default FilterAttributesPage;
