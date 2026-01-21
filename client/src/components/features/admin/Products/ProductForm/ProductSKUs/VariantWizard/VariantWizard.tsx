/**
 * VariantWizard Component
 * אשף ליצירת וריאנטים (SKUs) מהיר
 * 
 * Flow:
 * 1. בחירת צבעים מ-FilterAttribute
 * 2. בחירת מידות/סוגים מ-FilterAttribute (אופציונלי)
 * 3. בחירת שילובים בטבלה דו-ממדית
 * 4. מילוי אוטומטי של פרטי SKU
 * 
 * הקומפוננטה משתמשת בקומפוננטות:
 * - FilterAttributeValueSelector - לבחירת ערכים
 * - CombinationsGrid - לבחירת שילובים
 * - AutoFillModal - למילוי אוטומטי
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import FilterAttributeValueSelector, { type SelectedValue } from '../FilterAttributeValueSelector';
import CombinationsGrid, { type Combination, type AxisValue } from '../CombinationsGrid';
import AutoFillModal from '../AutoFillModal';
import type { SKUFormData } from '../../../../../../../schemas/productFormSchema';
import { Icon } from '../../../../../../ui/Icon';
import Modal from '../../../../../../ui/Modal';
import { Button } from '../../../../../../ui/Button';
import styles from './VariantWizard.module.css';

/**
 * שלב באשף
 */
type WizardStep = 'colors' | 'secondary' | 'combinations' | 'autofill';

/**
 * Props של הקומפוננטה
 */
export interface VariantWizardProps {
  /** האם האשף פתוח */
  isOpen: boolean;
  
  /** callback לסגירת האשף */
  onClose: () => void;
  
  /** callback לסיום האשף עם ה-SKUs שנוצרו */
  onComplete: (skus: SKUFormData[]) => void;
  
  /** ה-SKUs הקיימים (לחישוב קוד SKU הבא) */
  existingSkus?: SKUFormData[];
  
  /** נתונים מטופס המוצר */
  productFormData?: {
    name?: string;
    basePrice?: number;
    stockQuantity?: number;
    images?: SKUFormData['images'];
  };
  
  /** מפתח ציר משני (למשל 'size') - null אם אין */
  secondaryAttributeKey?: string | null;
  
  /** callback לשינוי ציר משני */
  onSecondaryAttributeChange?: (key: string | null) => void;
}

/**
 * קומפוננטת VariantWizard
 * אשף מונחה ליצירת וריאנטים
 */
const VariantWizard: React.FC<VariantWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  existingSkus = [],
  productFormData,
  secondaryAttributeKey = null,
}) => {
  // 🆕 חישוב צבעים קיימים מ-existingSkus (לסימון כ-disabled)
  const existingColors = useMemo((): SelectedValue[] => {
    if (!existingSkus || existingSkus.length === 0) return [];
    
    // מפת צבעים קיימים (למניעת כפילויות)
    const colorMap = new Map<string, SelectedValue>();
    
    for (const sku of existingSkus) {
      // בדיקת צבע בשדה color
      if (sku.color && sku.colorHex) {
        const key = sku.color.toLowerCase();
        if (!colorMap.has(key)) {
          colorMap.set(key, {
            value: sku.color,
            displayName: sku.color,
            hex: sku.colorHex,
            family: sku.colorFamily || 'other',
            disabled: true, // 🔒 נעול - לא ניתן להסרה
          });
        }
      }
      
      // 🆕 בדיקת צבע ב-attributes (צבע כציר משני)
      const attributes = (sku as any).attributes;
      if (attributes && attributes['צבע']) {
        const colorName = attributes['צבע'];
        const colorHex = attributes['צבעHex'] || sku.colorHex;
        if (colorHex) {
          const key = colorName.toLowerCase();
          if (!colorMap.has(key)) {
            colorMap.set(key, {
              value: colorName,
              displayName: colorName,
              hex: colorHex,
              family: attributes['צבעFamily'] || sku.colorFamily || 'other',
              disabled: true, // 🔒 נעול - לא ניתן להסרה
            });
          }
        }
      }
    }
    
    return Array.from(colorMap.values());
  }, [existingSkus]);
  
  // ===== State לניהול השלבים =====
  const [currentStep, setCurrentStep] = useState<WizardStep>('colors');
  
  // ===== State לנתונים =====
  // צבעים נבחרים (כולל קיימים מ-existingColors)
  const [selectedColors, setSelectedColors] = useState<SelectedValue[]>(existingColors);
  
  // ערכי ציר משני (מידות/סוגים)
  const [selectedSecondary, setSelectedSecondary] = useState<SelectedValue[]>([]);
  
  // שילובים נבחרים
  const [selectedCombinations, setSelectedCombinations] = useState<Combination[]>([]);
  
  // האם להציג מודאל AutoFill
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  
  // ===== אתחול מחדש בפתיחה =====
  useEffect(() => {
    if (isOpen) {
      // איפוס כל ה-state בפתיחה (אבל שמירה על צבעים קיימים)
      setCurrentStep('colors');
      setSelectedColors(existingColors); // 🔒 אתחול עם צבעים קיימים (נעולים)
      setSelectedSecondary([]);
      setSelectedCombinations([]);
      setShowAutoFillModal(false);
    }
  }, [isOpen, existingColors]); // 🔄 עדכון כשמשתנים existingColors

  // ===== המרת ערכים נבחרים ל-AxisValue =====
  const primaryAxisValues = useMemo<AxisValue[]>(() => {
    return selectedColors.map(c => ({
      value: c.value,
      displayName: c.displayName,
      hex: c.hex,
    }));
  }, [selectedColors]);

  const secondaryAxisValues = useMemo<AxisValue[]>(() => {
    return selectedSecondary.map(s => ({
      value: s.value,
      displayName: s.displayName,
    }));
  }, [selectedSecondary]);

  // ===== מעבר בין שלבים =====
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    switch (currentStep) {
      case 'colors':
        // אם יש ציר משני - עבור לבחירת ערכים משניים
        if (secondaryAttributeKey) {
          goToStep('secondary');
        } else {
          goToStep('combinations');
        }
        break;
      case 'secondary':
        goToStep('combinations');
        break;
      case 'combinations':
        goToStep('autofill');
        setShowAutoFillModal(true);
        break;
    }
  }, [currentStep, secondaryAttributeKey, goToStep]);

  const goBack = useCallback(() => {
    switch (currentStep) {
      case 'secondary':
        goToStep('colors');
        break;
      case 'combinations':
        if (secondaryAttributeKey) {
          goToStep('secondary');
        } else {
          goToStep('colors');
        }
        break;
      case 'autofill':
        goToStep('combinations');
        setShowAutoFillModal(false);
        break;
    }
  }, [currentStep, secondaryAttributeKey, goToStep]);

  // ===== חישוב האם אפשר להמשיך =====
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'colors':
        return selectedColors.length > 0;
      case 'secondary':
        return selectedSecondary.length > 0;
      case 'combinations':
        return selectedCombinations.length > 0;
      default:
        return true;
    }
  }, [currentStep, selectedColors, selectedSecondary, selectedCombinations]);

  // ===== טיפול בסיום AutoFill =====
  const handleAutoFillGenerate = useCallback((newSkus: SKUFormData[]) => {
    console.log('🆕 VariantWizard - AutoFillModal generated SKUs:', newSkus);
    // קריאה ל-callback עם ה-SKUs החדשים
    onComplete(newSkus);
    setShowAutoFillModal(false);
    onClose();
  }, [onComplete, onClose]);

  // ===== יצירת מפות עזר עבור AutoFillModal =====
  const primaryValuesMap = useMemo(() => {
    const map = new Map<string, { displayName: string; hex?: string; family?: string }>();
    selectedColors.forEach(c => {
      map.set(c.value, {
        displayName: c.displayName,
        hex: c.hex,
        family: c.family,
      });
    });
    return map;
  }, [selectedColors]);

  const secondaryValuesMap = useMemo(() => {
    const map = new Map<string, { displayName: string }>();
    selectedSecondary.forEach(s => {
      map.set(s.value, { displayName: s.displayName });
    });
    return map;
  }, [selectedSecondary]);

  // ===== רינדור שלב נוכחי =====
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'colors':
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <Icon name="Palette" size={24} className={styles.stepIcon} />
              <div>
                <h3 className={styles.stepTitle}>בחירת צבעים</h3>
                <p className={styles.stepDescription}>
                  בחר את הצבעים הזמינים למוצר זה
                </p>
              </div>
            </div>
            
            <FilterAttributeValueSelector
              attributeKey="color"
              selectedValues={selectedColors}
              onChange={setSelectedColors}
              showColorSwatches={true}
              showSearch={true}
              isRequired={true}
            />
            
            {selectedColors.length > 0 && (
              <div className={styles.selectionSummary}>
                <Icon name="Check" size={16} />
                <span>נבחרו {selectedColors.length} צבעים</span>
              </div>
            )}
          </div>
        );

      case 'secondary':
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <Icon name="Layers" size={24} className={styles.stepIcon} />
              <div>
                <h3 className={styles.stepTitle}>בחירת {secondaryAttributeKey === 'size' ? 'מידות' : 'ערכים'}</h3>
                <p className={styles.stepDescription}>
                  בחר את הערכים הזמינים לציר המשני
                </p>
              </div>
            </div>
            
            {secondaryAttributeKey && (
              <FilterAttributeValueSelector
                attributeKey={secondaryAttributeKey}
                selectedValues={selectedSecondary}
                onChange={setSelectedSecondary}
                showColorSwatches={false}
                showSearch={true}
                isRequired={true}
              />
            )}
            
            {selectedSecondary.length > 0 && (
              <div className={styles.selectionSummary}>
                <Icon name="Check" size={16} />
                <span>נבחרו {selectedSecondary.length} ערכים</span>
              </div>
            )}
          </div>
        );

      case 'combinations':
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <Icon name="Grid3x3" size={24} className={styles.stepIcon} />
              <div>
                <h3 className={styles.stepTitle}>בחירת שילובים</h3>
                <p className={styles.stepDescription}>
                  בחר אילו שילובים זמינים למכירה
                </p>
              </div>
            </div>
            
            <CombinationsGrid
              primaryValues={primaryAxisValues}
              secondaryValues={secondaryAxisValues}
              primaryLabel="צבע"
              secondaryLabel={secondaryAttributeKey === 'size' ? 'מידה' : secondaryAttributeKey || 'ערך'}
              selectedCombinations={selectedCombinations}
              onChange={setSelectedCombinations}
            />
          </div>
        );

      case 'autofill':
        return null; // AutoFill מטופל במודאל נפרד

      default:
        return null;
    }
  };

  // ===== רינדור התקדמות =====
  const steps = useMemo(() => {
    const allSteps: { key: WizardStep; label: string; icon: string }[] = [
      { key: 'colors', label: 'צבעים', icon: 'Palette' },
    ];
    
    if (secondaryAttributeKey) {
      allSteps.push({ key: 'secondary', label: secondaryAttributeKey === 'size' ? 'מידות' : 'ערכים', icon: 'Layers' });
    }
    
    allSteps.push(
      { key: 'combinations', label: 'שילובים', icon: 'Grid3x3' },
      { key: 'autofill', label: 'יצירה', icon: 'Zap' }
    );
    
    return allSteps;
  }, [secondaryAttributeKey]);

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // ===== רינדור הקומפוננטה =====
  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showAutoFillModal}
        onClose={onClose}
        title="אשף יצירת וריאנטים"
        size="large"
      >
        <div className={styles.wizard}>
          {/* התקדמות */}
          <div className={styles.progress}>
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`${styles.progressStep} ${index < currentStepIndex ? styles.completed : ''} ${index === currentStepIndex ? styles.active : ''}`}
              >
                <div className={styles.progressIcon}>
                  {index < currentStepIndex ? (
                    <Icon name="Check" size={16} />
                  ) : (
                    <Icon name={step.icon as any} size={16} />
                  )}
                </div>
                <span className={styles.progressLabel}>{step.label}</span>
                {index < steps.length - 1 && <div className={styles.progressLine} />}
              </div>
            ))}
          </div>

          {/* תוכן השלב */}
          <div className={styles.content}>
            {renderCurrentStep()}
          </div>

          {/* כפתורי ניווט */}
          <div className={styles.navigation}>
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? onClose : goBack}
            >
              {currentStepIndex === 0 ? 'ביטול' : 'הקודם'}
            </Button>
            
            <div className={styles.stepIndicator}>
              שלב {currentStepIndex + 1} מתוך {steps.length}
            </div>
            
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!canProceed}
            >
              {currentStep === 'combinations' ? 'יצירת SKUs' : 'הבא'}
              <Icon name="ChevronLeft" size={16} />
            </Button>
          </div>
        </div>
      </Modal>

      {/* מודאל AutoFill */}
      <AutoFillModal
        isOpen={showAutoFillModal}
        onClose={() => {
          setShowAutoFillModal(false);
          goBack();
        }}
        onGenerate={handleAutoFillGenerate}
        combinations={selectedCombinations}
        productName={productFormData?.name || 'Product'}
        basePrice={productFormData?.basePrice || 0}
        primaryLabel="צבע"
        secondaryLabel={secondaryAttributeKey === 'size' ? 'מידה' : secondaryAttributeKey || 'ערך'}
        primaryValuesMap={primaryValuesMap}
        secondaryValuesMap={secondaryValuesMap}
        variantType="color"
      />
    </>
  );
};

export default VariantWizard;
