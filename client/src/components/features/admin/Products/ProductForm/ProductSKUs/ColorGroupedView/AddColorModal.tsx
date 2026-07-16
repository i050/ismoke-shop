/**
 * AddColorModal Component
 * =======================
 * מודאל להוספת צבע חדש עם בחירת מידות וכמות התחלתית
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Modal from '../../../../../../ui/Modal';
import { Icon } from '../../../../../../ui/Icon';
import type { SecondaryVariantConfig, NewColorData } from './types';
import {
  FilterAttributeService,
  type AdminColorFamily,
  type ColorVariant,
} from '../../../../../../../services/filterAttributeService';
import styles from './AddColorModal.module.css';

// Re-export types for backwards compatibility
export type { NewColorData } from './types';

interface AddColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewColorData) => void;
  /** הגדרות הוריאנט המשני (null = ללא תת-וריאנט) */
  secondaryConfig?: SecondaryVariantConfig | null;
  /** מחיר בסיס מהמוצר */
  basePrice: number;
  /** צבעים קיימים (למניעת כפילות) */
  existingColors: string[];
  /** האם בטעינה */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// 🔄 Fallback - רשימת צבעים בסיסית במקרה שהשרת לא זמין
// בפועל, הצבעים נטענים דינמית מהשרת
const FALLBACK_COLOR_FAMILIES: AdminColorFamily[] = [
  { family: 'black', displayName: 'שחור', representativeHex: '#000000', variants: [{ name: 'שחור', hex: '#000000' }] },
  { family: 'white', displayName: 'לבן', representativeHex: '#FFFFFF', variants: [{ name: 'לבן', hex: '#FFFFFF' }] },
  { family: 'red', displayName: 'אדום', representativeHex: '#EF4444', variants: [{ name: 'אדום', hex: '#EF4444' }] },
  { family: 'blue', displayName: 'כחול', representativeHex: '#3B82F6', variants: [{ name: 'כחול', hex: '#3B82F6' }] },
  { family: 'green', displayName: 'ירוק', representativeHex: '#22C55E', variants: [{ name: 'ירוק', hex: '#22C55E' }] },
  { family: 'yellow', displayName: 'צהוב', representativeHex: '#EAB308', variants: [{ name: 'צהוב', hex: '#EAB308' }] },
  { family: 'orange', displayName: 'כתום', representativeHex: '#F97316', variants: [{ name: 'כתום', hex: '#F97316' }] },
  { family: 'purple', displayName: 'סגול', representativeHex: '#A855F7', variants: [{ name: 'סגול', hex: '#A855F7' }] },
  { family: 'pink', displayName: 'ורוד', representativeHex: '#EC4899', variants: [{ name: 'ורוד', hex: '#EC4899' }] },
  { family: 'gray', displayName: 'אפור', representativeHex: '#6B7280', variants: [{ name: 'אפור', hex: '#6B7280' }] },
  {
    family: 'brown',
    displayName: 'חום',
    representativeHex: '#78350F',
    variants: [
      { name: 'חום', hex: '#78350F' },
      { name: 'בז\'', hex: '#D4A373' },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

const AddColorModal: React.FC<AddColorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  secondaryConfig,
  basePrice,
  existingColors,
  isLoading = false,
}) => {
  // משפחות הצבע והגוונים נטענים ממקור האמת בשרת בכל פתיחה של המודאל.
  const [colorFamilies, setColorFamilies] = useState<AdminColorFamily[]>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  
  // 🆕 האם יש ציר משני (אם לא - רק צבעים)
  const hasSecondaryVariant = secondaryConfig !== null;
  
  // variantConfig - רק אם יש ציר משני
  const variantConfig = secondaryConfig || {
    attributeKey: 'size',
    attributeName: 'מידה',
    values: DEFAULT_SIZES.map(s => ({ value: s }))
  };
  
  // Form state
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [colorHexWasExplicitlySet, setColorHexWasExplicitlySet] = useState(false);
  const [selectedColorFamily, setSelectedColorFamily] = useState<string | undefined>(undefined); // 🆕 משפחת הצבע שנבחרה
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [initialQuantity, setInitialQuantity] = useState(10);
  const [price, setPrice] = useState<number | null>(null);
  const [selectedShadeName, setSelectedShadeName] = useState<string | null>(null);
  const [showNewShadeForm, setShowNewShadeForm] = useState(false);
  const [newShadeName, setNewShadeName] = useState('');
  const [newShadeHex, setNewShadeHex] = useState('#000000');
  const [isAddingShade, setIsAddingShade] = useState(false);
  const [shadeError, setShadeError] = useState<string | null>(null);
  const [shadeSuccess, setShadeSuccess] = useState<string | null>(null);
  const addingShadeRef = useRef(false);
  const colorFamiliesRequestIdRef = useRef(0);

  // Reset form when modal opens
  const handleOpen = useCallback(() => {
    setColorName('');
    setColorHex('#000000');
    setColorHexWasExplicitlySet(false);
    setSelectedColorFamily(undefined);
    setSelectedSizes([]);
    setInitialQuantity(10);
    setPrice(null);
    setSelectedShadeName(null);
    setShowNewShadeForm(false);
    setNewShadeName('');
    setNewShadeHex('#000000');
    setShadeError(null);
    setShadeSuccess(null);
  }, []);

  // Call handleOpen when modal opens
  useEffect(() => {
    if (isOpen) {
      handleOpen();
    }
  }, [isOpen, handleOpen]);

  // רענון בכל פתיחה מבטיח שגוונים שנוספו במסך הניהול יופיעו מיד גם כאן.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const requestId = ++colorFamiliesRequestIdRef.current;

    const loadColorFamilies = async () => {
      setLoadingColors(true);
      try {
        const families = await FilterAttributeService.getColorFamiliesForAdmin();
        if (!cancelled && requestId === colorFamiliesRequestIdRef.current) {
          setColorFamilies(families);
        }
      } catch (error) {
        console.error('⚠️ Failed to load color families, using fallback:', error);
        if (!cancelled && requestId === colorFamiliesRequestIdRef.current) {
          setColorFamilies([]);
        }
      } finally {
        if (!cancelled && requestId === colorFamiliesRequestIdRef.current) {
          setLoadingColors(false);
        }
      }
    };

    void loadColorFamilies();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Available values (from config or fallback to default sizes)
  const valuesToShow = useMemo(() => 
    variantConfig.values.length > 0 
      ? variantConfig.values.map(v => v.value) 
      : DEFAULT_SIZES,
    [variantConfig.values]
  );

  const availableColorFamilies = useMemo(
    () => colorFamilies.length > 0 ? colorFamilies : FALLBACK_COLOR_FAMILIES,
    [colorFamilies]
  );

  const selectedFamily = useMemo(
    () => availableColorFamilies.find((family) => family.family === selectedColorFamily),
    [availableColorFamilies, selectedColorFamily]
  );

  const selectColorFamily = useCallback((family: string) => {
    if (isAddingShade || family === selectedColorFamily) return;

    // ערכים שהגיעו מבחירה בספרייה אינם שייכים למשפחה החדשה.
    if (selectedShadeName) {
      setColorName('');
      setColorHex('#000000');
      setColorHexWasExplicitlySet(false);
    }

    setSelectedColorFamily(family);
    setSelectedShadeName(null);
    setShowNewShadeForm(false);
    setNewShadeName('');
    setShadeError(null);
    setShadeSuccess(null);
  }, [isAddingShade, selectedColorFamily, selectedShadeName]);

  const selectExistingShade = useCallback((shade: ColorVariant) => {
    if (isAddingShade) return;

    setColorName(shade.displayName?.trim() || shade.name);
    setColorHex(shade.hex.toUpperCase());
    setColorHexWasExplicitlySet(true);
    setSelectedShadeName(shade.name);
    setShowNewShadeForm(false);
    setShadeError(null);
    setShadeSuccess(null);
  }, [isAddingShade]);

  const openNewShadeForm = useCallback(() => {
    if (!selectedFamily || isAddingShade) return;

    const representativeHex = /^#[0-9A-Fa-f]{6}$/.test(selectedFamily.representativeHex)
      ? selectedFamily.representativeHex.toUpperCase()
      : '#000000';

    setNewShadeName('');
    setNewShadeHex(representativeHex);
    setShowNewShadeForm(true);
    setShadeError(null);
    setShadeSuccess(null);
  }, [selectedFamily, isAddingShade]);

  const newShadeNameNormalized = newShadeName.trim().toLocaleLowerCase('he');
  const newShadeDuplicate = useMemo(
    () => Boolean(
      newShadeNameNormalized && selectedFamily?.variants.some(
        (shade) => shade.name.trim().toLocaleLowerCase('he') === newShadeNameNormalized
      )
    ),
    [newShadeNameNormalized, selectedFamily]
  );
  const newShadeHexIsValid = /^#[0-9A-Fa-f]{6}$/.test(newShadeHex);
  const canAddShade = Boolean(
    selectedFamily &&
    newShadeName.trim() &&
    newShadeHexIsValid &&
    !newShadeDuplicate &&
    !isAddingShade
  );

  const addShadeToLibrary = useCallback(async () => {
    if (!canAddShade || !selectedFamily || addingShadeRef.current) return;

    const family = selectedFamily.family;
    const shade: ColorVariant = {
      name: newShadeName.trim(),
      hex: newShadeHex.toUpperCase(),
    };

    addingShadeRef.current = true;
    setIsAddingShade(true);
    setShadeError(null);
    setShadeSuccess(null);

    try {
      await FilterAttributeService.addColorVariant(family, shade.name, shade.hex);

      // כל תשובת GET שהתחילה לפני השמירה נחשבת מיושנת מרגע זה.
      colorFamiliesRequestIdRef.current += 1;
      setLoadingColors(false);

      // עדכון מיידי של הממשק; לאחריו מתבצע רענון ממקור האמת בשרת.
      setColorFamilies((currentFamilies) => {
        const sourceFamilies = currentFamilies.length > 0
          ? currentFamilies
          : FALLBACK_COLOR_FAMILIES;

        return sourceFamilies.map((colorFamily) => colorFamily.family === family
          ? { ...colorFamily, variants: [...colorFamily.variants, shade] }
          : colorFamily
        );
      });
      setColorName(shade.name);
      setColorHex(shade.hex);
      setColorHexWasExplicitlySet(true);
      setSelectedShadeName(shade.name);
      setNewShadeName('');
      setShowNewShadeForm(false);
      setShadeSuccess(`הגוון "${shade.name}" נוסף לספריית ${selectedFamily.displayName} ונבחר בטופס.`);

      // הרענון משני לשמירה: הוא אינו משאיר את המודאל נעול ואינו דורס עדכון חדש יותר.
      const refreshRequestId = ++colorFamiliesRequestIdRef.current;
      void FilterAttributeService.getColorFamiliesForAdmin()
        .then((refreshedFamilies) => {
          if (refreshRequestId !== colorFamiliesRequestIdRef.current) return;

          const refreshedShadeExists = refreshedFamilies
            .find((colorFamily) => colorFamily.family === family)
            ?.variants.some(
              (variant) => variant.name.toLocaleLowerCase('he') === shade.name.toLocaleLowerCase('he')
            );

          if (refreshedShadeExists) {
            setColorFamilies(refreshedFamilies);
          } else {
            console.warn('Shade was added, but was not present in the immediate refresh response.');
          }
        })
        .catch((refreshError) => {
          // השמירה כבר הצליחה; משאירים את העדכון המקומי ולא מציגים כשל מטעה למנהל.
          console.warn('Shade was added, but refreshing color families failed:', refreshError);
        });
    } catch (error) {
      setShadeError(error instanceof Error ? error.message : 'לא ניתן היה להוסיף את הגוון. נסה שוב.');
    } finally {
      addingShadeRef.current = false;
      setIsAddingShade(false);
    }
  }, [canAddShade, selectedFamily, newShadeName, newShadeHex]);

  const handleClose = useCallback(() => {
    if (isLoading || isAddingShade || addingShadeRef.current) return;
    onClose();
  }, [isLoading, isAddingShade, onClose]);

  // Check if color already exists
  const colorExists = useMemo(() => 
    existingColors.some(c => c.toLowerCase() === colorName.toLowerCase().trim()),
    [existingColors, colorName]
  );

  // Toggle size selection
  const toggleSize = useCallback((size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  }, []);

  // Select all sizes/values
  const selectAllSizes = useCallback(() => {
    setSelectedSizes([...valuesToShow]);
  }, [valuesToShow]);

  // Clear size selection
  const clearSizes = useCallback(() => {
    setSelectedSizes([]);
  }, []);

  // Quick color selection - הוסר! עכשיו רק בחירה ידנית

  // Form validation - 🆕 גם color וגם colorHex הפכו לאופציונליים!
  // אם המנהל לא בחר - המערכת תיצור אוטומטית על בסיס colorFamily
  const isValid = useMemo(() => 
    selectedColorFamily && // משפחת צבע חובה (לסינון)
    selectedColorFamily.trim().length > 0 &&
    // colorName אופציונלי! אם ריק - ייווצר אוטומטית מ-colorFamily
    // colorHex אופציונלי! אם ריק או לא תקין - ייווצר אוטומטית
    (!colorHex || colorHex === '#000000' || /^#[0-9A-Fa-f]{6}$/.test(colorHex)) &&
    (hasSecondaryVariant ? selectedSizes.length > 0 : true) &&
    (!colorName.trim() || !colorExists), // אם יש שם - בדוק שלא קיים
    [selectedColorFamily, colorName, colorHex, selectedSizes, colorExists, hasSecondaryVariant]
  );

  // Handle submit - 🆕 אם colorName ריק או colorHex ריק - שולח undefined
  const handleSubmit = useCallback(() => {
    if (!isValid || isAddingShade) return;

    // אם המנהל לא הזין שם צבע - שולח undefined כדי שהמערכת תיצור אוטומטית
    const finalColorName = colorName.trim() || undefined;
    
    // אם המנהל לא בחר colorHex (נשאר על ברירת המחדל #000000) - שולח undefined
    // כדי שהמערכת תיצור אוטומטית על בסיס colorFamily
    const finalColorHex = colorHex && (colorHexWasExplicitlySet || colorHex !== '#000000')
      ? colorHex
      : undefined;

    onSubmit({
      colorName: finalColorName, // 🆕 יכול להיות undefined
      colorHex: finalColorHex,
      colorFamily: selectedColorFamily, // 🆕 העברת משפחת הצבע שנבחרה
      selectedSizes,
      initialQuantity,
      basePrice: price,
    });

    onClose();
  }, [isValid, isAddingShade, colorName, colorHex, colorHexWasExplicitlySet, selectedColorFamily, selectedSizes, initialQuantity, price, onSubmit, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="הוספת צבע חדש"
      size="large"
      closeOnOverlayClick={!isLoading && !isAddingShade}
      closeOnEscape={!isLoading && !isAddingShade}
    >
      <div className={styles.content}>
        {/* משפחת צבע (לסינון) - חובה */}
        <div className={styles.section}>
          <label className={styles.label}>
            <Icon name="Filter" size={16} />
            משפחת צבע (לסינון)
            <span className={styles.required}>*</span>
          </label>
          <p className={styles.hint}>
            קובע איך הלקוחות יסננו מוצר זה (לדוגמה: כל הגוונים של כחול יסוננו תחת "כחול")
          </p>
          
          {/* טעינת משפחות צבעים */}
          {loadingColors && (
            <div className={styles.loadingHint}>
              <Icon name="Loader2" size={14} className={styles.spinner} />
              טוען משפחות צבעים...
            </div>
          )}
          
          {/* כפתורי בחירת משפחת צבע */}
          <div className={styles.colorFamilyButtons}>
            {availableColorFamilies.map((family) => (
              <button
                key={family.family}
                type="button"
                className={`${styles.familyButton} ${
                  selectedColorFamily === family.family ? styles.selected : ''
                }`}
                onClick={() => selectColorFamily(family.family)}
                title={family.displayName}
                aria-pressed={selectedColorFamily === family.family}
                disabled={isAddingShade}
              >
                <span
                  className={styles.familyColorDot}
                  style={{ backgroundColor: family.representativeHex }}
                />
                <span className={styles.familyName}>{family.displayName}</span>
                {selectedColorFamily === family.family && (
                  <Icon name="Check" size={14} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>

          {selectedFamily && (
            <div className={styles.shadeLibrary}>
              <div className={styles.shadeLibraryHeader}>
                <div>
                  <span className={styles.shadeLibraryTitle}>גוונים קיימים במשפחת {selectedFamily.displayName}</span>
                  <span className={styles.shadeCount}>{selectedFamily.variants.length} גוונים</span>
                </div>
                <Icon name="Palette" size={18} />
              </div>

              {selectedFamily.variants.length > 0 ? (
                <div className={styles.shadeGrid} aria-label={`גוונים במשפחת ${selectedFamily.displayName}`}>
                  {selectedFamily.variants.map((shade) => {
                    const isSelected = selectedShadeName?.toLocaleLowerCase('he') === shade.name.toLocaleLowerCase('he');
                    const displayName = shade.displayName?.trim() || shade.name;

                    return (
                      <button
                        key={shade.name}
                        type="button"
                        className={`${styles.shadeButton} ${isSelected ? styles.shadeSelected : ''}`}
                        onClick={() => selectExistingShade(shade)}
                        aria-pressed={isSelected}
                        disabled={isAddingShade}
                      >
                        <span
                          className={styles.shadeSwatch}
                          style={{ backgroundColor: shade.hex }}
                        />
                        <span className={styles.shadeDetails}>
                          <span className={styles.shadeName}>{displayName}</span>
                          <span className={styles.shadeHex}>{shade.hex.toUpperCase()}</span>
                        </span>
                        {isSelected && <Icon name="Check" size={16} className={styles.shadeCheck} />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyShades}>עדיין אין גוונים במשפחה זו.</p>
              )}

              {!showNewShadeForm ? (
                <button
                  type="button"
                  className={styles.addShadeButton}
                  onClick={openNewShadeForm}
                  disabled={isAddingShade}
                >
                  <Icon name="Plus" size={17} />
                  הוסף גוון חדש למשפחת {selectedFamily.displayName}
                </button>
              ) : (
                <div className={styles.newShadeForm}>
                  <div className={styles.newShadeHeader}>
                    <strong>גוון חדש במשפחת {selectedFamily.displayName}</strong>
                    <button
                      type="button"
                      className={styles.closeShadeFormButton}
                      onClick={() => {
                        setShowNewShadeForm(false);
                        setShadeError(null);
                      }}
                      disabled={isAddingShade}
                      aria-label="סגור טופס הוספת גוון"
                    >
                      <Icon name="X" size={17} />
                    </button>
                  </div>

                  <div className={styles.newShadeInputs}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="new-shade-name">שם הגוון</label>
                      <input
                        id="new-shade-name"
                        type="text"
                        className={styles.input}
                        value={newShadeName}
                        onChange={(event) => {
                          setNewShadeName(event.target.value);
                          setShadeError(null);
                        }}
                        placeholder="לדוגמה: תכלת עננים"
                        disabled={isAddingShade}
                        aria-invalid={newShadeDuplicate}
                        aria-describedby={newShadeDuplicate ? 'new-shade-name-error' : undefined}
                        autoFocus
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="new-shade-hex">קוד צבע (HEX)</label>
                      <div className={styles.colorPickerWrapper}>
                        <input
                          type="color"
                          className={styles.colorPicker}
                          value={newShadeHex}
                          onChange={(event) => {
                            setNewShadeHex(event.target.value.toUpperCase());
                            setShadeError(null);
                          }}
                          title="בחר גוון מדויק"
                          disabled={isAddingShade}
                        />
                        <input
                          id="new-shade-hex"
                          type="text"
                          className={styles.hexInput}
                          value={newShadeHex}
                          onChange={(event) => {
                            const hex = event.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                              setNewShadeHex(hex.toUpperCase());
                              setShadeError(null);
                            }
                          }}
                          placeholder="#000000"
                          maxLength={7}
                          disabled={isAddingShade}
                          aria-invalid={newShadeHex.length > 0 && !newShadeHexIsValid}
                          aria-describedby={newShadeHex.length > 0 && !newShadeHexIsValid ? 'new-shade-hex-error' : undefined}
                        />
                      </div>
                    </div>
                  </div>

                  {newShadeDuplicate && (
                    <p id="new-shade-name-error" className={styles.inlineError} role="alert">
                      כבר קיים גוון בשם הזה במשפחה.
                    </p>
                  )}
                  {newShadeHex.length > 0 && !newShadeHexIsValid && (
                    <p id="new-shade-hex-error" className={styles.inlineError} role="alert">
                      יש להזין קוד HEX מלא, לדוגמה #4A90E2.
                    </p>
                  )}

                  <p className={styles.libraryNotice}>
                    <Icon name="Info" size={15} />
                    הגוון נשמר מיד בספריית הצבעים הכללית ויישאר בה גם אם תבטל אחר כך את עריכת המוצר.
                  </p>

                  <div className={styles.newShadeActions}>
                    <button
                      type="button"
                      className={styles.cancelShadeButton}
                      onClick={() => {
                        setShowNewShadeForm(false);
                        setShadeError(null);
                      }}
                      disabled={isAddingShade}
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      className={styles.saveShadeButton}
                      onClick={() => void addShadeToLibrary()}
                      disabled={!canAddShade}
                    >
                      {isAddingShade ? (
                        <>
                          <span className={styles.spinner} />
                          שומר גוון...
                        </>
                      ) : (
                        <>
                          <Icon name="Plus" size={16} />
                          שמור ובחר גוון
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {shadeError && (
                <div className={styles.shadeMessageError} role="alert">
                  <Icon name="AlertCircle" size={16} />
                  {shadeError}
                </div>
              )}
              {shadeSuccess && (
                <div className={styles.shadeMessageSuccess} role="status">
                  <Icon name="CheckCircle" size={16} />
                  {shadeSuccess}
                </div>
              )}
            </div>
          )}
        </div>

        {/* צבע תצוגה (חופשי) - אופציונלי */}
        <div className={styles.section}>
          <label className={styles.label}>
            <Icon name="Palette" size={16} />
            צבע תצוגה
            <span className={styles.optional}> (אופציונלי)</span>
          </label>
          <p className={styles.hint}>
            שם ייחודי לגוון (לדוגמה: "תכלת עננים"). אם תשאיר ריק, ישתמש בשם ברירת המחדל של משפחת הצבע.
          </p>
          
          <div className={styles.displayColorInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>שם הצבע</label>
              <input
                type="text"
                className={styles.input}
                value={colorName}
                onChange={(e) => {
                  setColorName(e.target.value);
                  setSelectedShadeName(null);
                  setShadeSuccess(null);
                }}
                placeholder="השאר ריק לשם ברירת מחדל..."
                disabled={isAddingShade}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>קוד צבע (HEX) - אופציונלי</label>
              <div className={styles.colorPickerWrapper}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={colorHex}
                  onChange={(e) => {
                    setColorHex(e.target.value);
                    setColorHexWasExplicitlySet(true);
                    setSelectedShadeName(null);
                    setShadeSuccess(null);
                  }}
                  title="בחר גוון מדויק"
                  disabled={isAddingShade}
                />
                <input
                  type="text"
                  className={styles.hexInput}
                  value={colorHex}
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                      setColorHex(hex);
                      setColorHexWasExplicitlySet(true);
                      setSelectedShadeName(null);
                      setShadeSuccess(null);
                    }
                  }}
                  placeholder="#000000"
                  maxLength={7}
                  disabled={isAddingShade}
                />
              </div>
            </div>
          </div>

          {/* תצוגה מקדימה של הצבע */}
          {colorName && (
            <div className={styles.colorPreviewBox}>
              <span 
                className={styles.colorPreview} 
                style={{ backgroundColor: colorHex }}
              />
              <div className={styles.previewInfo}>
                <span className={styles.colorLabel}>{colorName}</span>
                <span className={styles.colorCode}>{colorHex}</span>
              </div>
              {colorExists && (
                <span className={styles.errorTag}>
                  <Icon name="AlertCircle" size={12} />
                  צבע זה כבר קיים
                </span>
              )}
            </div>
          )}
        </div>

        {/* Size/Variant Selection - 🆕 רק אם יש ציר משני */}
        {hasSecondaryVariant && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <label className={styles.label}>בחר {variantConfig.attributeName}ים</label>
            <div className={styles.sizeActions}>
              <button 
                type="button" 
                className={styles.textButton}
                onClick={selectAllSizes}
              >
                בחר הכל
              </button>
              <button 
                type="button" 
                className={styles.textButton}
                onClick={clearSizes}
              >
                נקה
              </button>
            </div>
          </div>

          <div className={styles.sizesGrid}>
            {valuesToShow.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.sizeButton} ${
                  selectedSizes.includes(value) ? styles.sizeSelected : ''
                }`}
                onClick={() => toggleSize(value)}
              >
                {value}
              </button>
            ))}
          </div>

          {selectedSizes.length === 0 && (
            <p className={styles.hint}>בחר לפחות {variantConfig.attributeName} אחד</p>
          )}
        </div>
        )}

        {/* Quantity & Price */}
        <div className={styles.section}>
          <div className={styles.twoColumns}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {hasSecondaryVariant 
                  ? `כמות התחלתית לכל ${variantConfig.attributeName}`
                  : 'כמות התחלתית'
                }
              </label>
              <input
                type="number"
                className={styles.input}
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                min={0}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>מחיר</label>
              <div className={styles.priceInputWrapper}>
                <input
                  type="number"
                  className={styles.input}
                  value={price ?? ''}
                  onChange={(e) => setPrice(e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder={`₪${basePrice}`}
                  min={0}
                  step="0.01"
                />
                <span className={styles.currency}>₪</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {isValid && (
          <div className={styles.summary}>
            <Icon name="Info" size={16} />
            <span>
              ייווצרו <strong>{selectedSizes.length}</strong> וריאציות חדשות
              בצבע <strong>{colorName}</strong>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isLoading || isAddingShade}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!isValid || isLoading || isAddingShade}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                יוצר...
              </>
            ) : (
              <>
                <Icon name="Plus" size={16} />
                הוסף צבע
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddColorModal;
