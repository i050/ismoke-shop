import React, { useState, useEffect } from 'react';
import * as filterAttributeService from '../../../services/filterAttributeService';
import type { FilterAttribute } from '../../../services/filterAttributeService';
import { BrandService, type Brand } from '../../../services/brandService';
import { Button, Icon, TitleWithIcon } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import AttributeCard from './AttributeCard';
import AttributeModal from './AttributeModal';
import { DeleteAttributeModal } from './DeleteAttributeModal';
import BrandCard from './BrandCard/BrandCard';
import BrandModal from './BrandModal/BrandModal';
import styles from './FilterAttributesPage.module.css';

/**
 * עמוד ניהול מאפייני סינון ומותגים
 * מאפשר למנהל ליצור, לערוך ולמחוק מאפיינים ומותגים גלובליים
 * משתמש בטאבים להפרדה בין מאפיינים למותגים
 */
const FilterAttributesPage: React.FC = () => {
  const { showToast } = useToast();
  
  // טאב פעיל: 'attributes' או 'brands'
  const [activeTab, setActiveTab] = useState<'attributes' | 'brands'>('attributes');
  
  // ============================================================================
  // State - מאפיינים
  // ============================================================================
  const [attributes, setAttributes] = useState<FilterAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(true);
  const [errorAttributes, setErrorAttributes] = useState<string | null>(null);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<FilterAttribute | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Delete modal state - מאפיינים
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FilterAttribute | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // ============================================================================
  // State - מותגים
  // ============================================================================
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [errorBrands, setErrorBrands] = useState<string | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // טעינת מאפיינים ומותגים בעת טעינת הדף
  useEffect(() => {
    loadAttributes();
    loadBrands();
  }, []);

  // ============================================================================
  // פונקציות - מאפיינים
  // ============================================================================

  /**
   * טעינת כל המאפיינים מהשרת
   */
  const loadAttributes = async () => {
    try {
      setLoadingAttributes(true);
      setErrorAttributes(null);
      const data = await filterAttributeService.FilterAttributeService.getAllAttributes();
      setAttributes(data);
      console.log('✅ נטענו מאפיינים:', data.length);
    } catch (err: any) {
      console.error('❌ שגיאה בטעינת מאפיינים:', err);
      const errorMessage = err.message || 'שגיאה בטעינת המאפיינים';
      setErrorAttributes(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoadingAttributes(false);
    }
  };

  /**
   * פתיחת מודאל ליצירת מאפיין חדש
   */
  const handleCreateAttribute = () => {
    setEditingAttribute(null);
    setShowAttributeModal(true);
  };

  /**
   * פתיחת מודאל לעריכת מאפיין קיים
   */
  const handleEditAttribute = (attribute: FilterAttribute) => {
    setEditingAttribute(attribute);
    setShowAttributeModal(true);
  };

  /**
   * מחיקת מאפיין
   * פותח מודאל עם בדיקת שימוש וספירה לאחור
   */
  const handleDeleteAttribute = async (id: string, name: string) => {
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
  const handleAttributeModalSuccess = () => {
    setShowAttributeModal(false);
    setEditingAttribute(null);
    loadAttributes(); // טעינה מחדש של כל המאפיינים
  };

  /**
   * סגירת מודאל ללא שמירה
   */
  const handleAttributeModalClose = () => {
    setShowAttributeModal(false);
    setEditingAttribute(null);
  };

  // ============================================================================
  // פונקציות - מותגים
  // ============================================================================

  /**
   * טעינת כל המותגים מהשרת
   */
  const loadBrands = async () => {
    try {
      setLoadingBrands(true);
      setErrorBrands(null);
      const data = await BrandService.getAllBrands();
      setBrands(data);
      console.log('✅ נטענו מותגים:', data.length);
    } catch (err: any) {
      console.error('❌ שגיאה בטעינת מותגים:', err);
      const errorMessage = err.message || 'שגיאה בטעינת המותגים';
      setErrorBrands(errorMessage);
    } finally {
      setLoadingBrands(false);
    }
  };

  /**
   * פתיחת מודאל ליצירת מותג חדש
   */
  const handleCreateBrand = () => {
    setEditingBrand(null);
    setShowBrandModal(true);
  };

  /**
   * פתיחת מודאל לעריכת מותג קיים
   */
  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setShowBrandModal(true);
  };

  /**
   * מחיקת מותג
   */
  const handleDeleteBrand = async (brand: Brand) => {
    // בדיקת שימוש
    try {
      const { usageCount } = await BrandService.getBrandUsage(brand._id);
      
      if (usageCount > 0) {
        showToast('error', `לא ניתן למחוק את "${brand.name}" - משויך ל-${usageCount} מוצרים`);
        return;
      }
      
      // אישור מחיקה
      if (!confirm(`האם אתה בטוח שברצונך למחוק את המותג "${brand.name}"?`)) {
        return;
      }
      
      await BrandService.deleteBrand(brand._id);
      setBrands(prev => prev.filter(b => b._id !== brand._id));
      showToast('success', `המותג "${brand.name}" נמחק בהצלחה`);
    } catch (err: any) {
      console.error('❌ שגיאה במחיקת מותג:', err);
      showToast('error', err.message || 'שגיאה במחיקת המותג');
    }
  };

  /**
   * סגירת מודאל מותג והצלחה
   */
  const handleBrandModalSuccess = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
    loadBrands();
  };

  /**
   * סגירת מודאל מותג
   */
  const handleBrandModalClose = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  // משתנים לפי טאב פעיל
  const loading = activeTab === 'attributes' ? loadingAttributes : loadingBrands;
  const error = activeTab === 'attributes' ? errorAttributes : errorBrands;

  // מצב טעינה
  if (loading && ((activeTab === 'attributes' && attributes.length === 0) || (activeTab === 'brands' && brands.length === 0))) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Icon name="Clock" size={48} />
          <p>טוען {activeTab === 'attributes' ? 'מאפיינים' : 'מותגים'}...</p>
        </div>
      </div>
    );
  }

  // מצב שגיאה
  if (error && ((activeTab === 'attributes' && attributes.length === 0) || (activeTab === 'brands' && brands.length === 0))) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <Icon name="AlertCircle" size={48} />
          <h3>שגיאה בטעינת {activeTab === 'attributes' ? 'המאפיינים' : 'המותגים'}</h3>
          <p>{error}</p>
          <Button variant="primary" onClick={activeTab === 'attributes' ? loadAttributes : loadBrands}>
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
        <TitleWithIcon icon="Filter" title="מאפייני מוצרים" />
        <p className={styles.subtitle}>
          ניהול מאפייני מוצרים ומותגים שלקוחות יכולים לסנן לפיהם בחנות
        </p>
      </div>

      {/* טאבים */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'attributes' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('attributes')}
        >
          <Icon name="Filter" size={18} />
          מאפיינים
          <span className={styles.tabBadge}>{attributes.length}</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'brands' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('brands')}
        >
          <Icon name="Award" size={18} />
          מותגים
          <span className={styles.tabBadge}>{brands.length}</span>
        </button>
      </div>

      {/* ============ תוכן טאב מאפיינים ============ */}
      {activeTab === 'attributes' && (
        <>
          {/* כפתור הוספת מאפיין */}
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleCreateAttribute}
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
                  onEdit={() => handleEditAttribute(attr)}
                  onDelete={() => handleDeleteAttribute(attr._id, attr.name)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <Icon name="Package" size={64} />
              <h3>אין מאפייני מוצרים עדיין</h3>
              <p>
                צור מאפיינים כמו צבע, גודל, חומר וכו' שיוכלו להיות מסוננים בחנות
              </p>
              <Button variant="primary" onClick={handleCreateAttribute}>
                <Icon name="Plus" size={18} />
                צור מאפיין ראשון
              </Button>
            </div>
          )}
        </>
      )}

      {/* ============ תוכן טאב מותגים ============ */}
      {activeTab === 'brands' && (
        <>
          {/* כפתור הוספת מותג */}
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleCreateBrand}
            >
              <Icon name="Plus" size={18} />
              הוסף מותג חדש
            </Button>
            
            {brands.length > 0 && (
              <div className={styles.statsInfo}>
                <Icon name="Award" size={16} />
                <span>סה"כ {brands.length} מותגים</span>
              </div>
            )}
          </div>

          {/* רשימת מותגים או מצב ריק */}
          {brands && brands.length > 0 ? (
            <div className={styles.brandsList}>
              {brands.map((brand) => (
                <BrandCard
                  key={brand._id}
                  brand={brand}
                  onEdit={() => handleEditBrand(brand)}
                  onDelete={() => handleDeleteBrand(brand)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <Icon name="Award" size={64} />
              <h3>אין מותגים עדיין</h3>
              <p>
                הוסף מותגים כדי שתוכל לבחור אותם במוצרים
              </p>
              <Button variant="primary" onClick={handleCreateBrand}>
                <Icon name="Plus" size={18} />
                צור מותג ראשון
              </Button>
            </div>
          )}
        </>
      )}

      {/* מודאל יצירה/עריכה - מאפיינים */}
      {showAttributeModal && (
        <AttributeModal
          attribute={editingAttribute}
          onClose={handleAttributeModalClose}
          onSuccess={handleAttributeModalSuccess}
        />
      )}

      {/* מודאל מחיקה עם ספירה לאחור - מאפיינים */}
      <DeleteAttributeModal
        isOpen={showDeleteModal}
        attribute={deleteTarget}
        usageCount={deleteUsageCount}
        isProcessing={isProcessingDelete}
        onClose={handleCloseDeleteModal}
        onRemoveFromAll={handleRemoveFromAllAndDelete}
        onDelete={handleDirectDelete}
      />

      {/* מודאל יצירה/עריכה - מותגים */}
      {showBrandModal && (
        <BrandModal
          brand={editingBrand}
          onClose={handleBrandModalClose}
          onSuccess={handleBrandModalSuccess}
        />
      )}
    </div>
  );
};

export default FilterAttributesPage;
