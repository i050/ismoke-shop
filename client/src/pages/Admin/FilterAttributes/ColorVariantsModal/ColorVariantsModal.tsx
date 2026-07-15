/**
 * ColorVariantsModal — ניהול גוונים בתוך משפחות צבע.
 *
 * עריכת גוון מתבצעת בתוך המודאל עצמו ולא במודאל מקונן. כך אין שכבות־על
 * וקיצורי מקלדת מתנגשים, והפעולות נשארות זמינות גם במסכים קטנים.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import { Button, Icon } from '../../../../components/ui';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import { FilterAttributeService, type ColorFamily } from '../../../../services/filterAttributeService';
import { useToast } from '../../../../hooks/useToast';
import styles from './ColorVariantsModal.module.css';

interface ColorVariantsModalProps {
  attribute: { name: string; key: string; colorFamilies?: ColorFamily[] };
  onClose: () => void;
}

interface VariantEntry {
  name: string;
  hex: string;
}

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

const ColorVariantsModal: React.FC<ColorVariantsModalProps> = ({ attribute, onClose }) => {
  const { showToast } = useToast();
  const [families, setFamilies] = useState<ColorFamily[]>(attribute.colorFamilies || []);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // משפחות צבע מתחילות סגורות; המנהל פותח רק את המשפחה שבה הוא עובד.
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(() => new Set());

  const [editing, setEditing] = useState<{ family: string; variant: VariantEntry } | null>(null);
  const [editName, setEditName] = useState('');
  const [editHex, setEditHex] = useState('#000000');

  const [addFormFamily, setAddFormFamily] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addHex, setAddHex] = useState('#000000');

  const [deleteTarget, setDeleteTarget] = useState<{ family: string; variant: VariantEntry } | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);

  const loadFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await FilterAttributeService.getAllColorFamilies();
      setFamilies(data);
    } catch {
      showToast('error', 'שגיאה בטעינת משפחות הצבע');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadFamilies();
  }, [loadFamilies]);

  const isValidColor = (value: string) => HEX_COLOR_PATTERN.test(value);

  const toggleFamily = (family: string) => {
    setExpandedFamilies((current) => {
      const next = new Set(current);
      next.has(family) ? next.delete(family) : next.add(family);
      return next;
    });
  };

  const handleAdd = async (family: string) => {
    if (!addName.trim() || !isValidColor(addHex)) {
      showToast('warning', 'יש להזין שם גוון וקוד HEX תקין');
      return;
    }

    try {
      setIsSaving(true);
      await FilterAttributeService.addColorVariant(family, addName.trim(), addHex.toUpperCase());
      showToast('success', `הגוון „${addName.trim()}” נוסף בהצלחה`);
      setAddName('');
      setAddHex('#000000');
      setAddFormFamily(null);
      await loadFamilies();
    } catch (error: any) {
      showToast('error', error.message || 'שגיאה בהוספת גוון');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (family: string, variant: VariantEntry) => {
    setAddFormFamily(null);
    setEditing({ family, variant });
    setEditName(variant.name);
    setEditHex(variant.hex);
  };

  const handleEdit = async () => {
    if (!editing) return;
    if (!editName.trim() || !isValidColor(editHex)) {
      showToast('warning', 'יש להזין שם גוון וקוד HEX תקין');
      return;
    }

    try {
      setIsSaving(true);
      await FilterAttributeService.updateColorVariant(editing.family, editing.variant.name, {
        name: editName.trim(),
        hex: editHex.toUpperCase(),
      });
      showToast('success', `הגוון „${editName.trim()}” עודכן בהצלחה`);
      setEditing(null);
      await loadFamilies();
    } catch (error: any) {
      showToast('error', error.message || 'שגיאה בעדכון גוון');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreDelete = async (family: string, variant: VariantEntry) => {
    try {
      const usageCount = await FilterAttributeService.getColorVariantUsage(family, variant.name);
      setDeleteUsageCount(usageCount);
    } catch {
      setDeleteUsageCount(0);
    }
    setDeleteTarget({ family, variant });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsSaving(true);
      await FilterAttributeService.deleteColorVariant(deleteTarget.family, deleteTarget.variant.name);
      showToast('success', `הגוון „${deleteTarget.variant.name}” נמחק`);
      setDeleteTarget(null);
      await loadFamilies();
    } catch (error: any) {
      showToast('error', error.message || 'שגיאה במחיקת גוון');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`ניהול גוונים — ${attribute.name}`} size="fullscreen">
      <div className={styles.container}>
        <p className={styles.description}>
          הוספה, עריכה ומחיקה של גוונים בתוך משפחות הצבע. מחיקת גוון אינה מוחקת מוצרים קיימים.
        {loading && <span className={styles.loading}> מעדכן נתונים…</span>}
        </p>

        {families.map((family) => {
          const isExpanded = expandedFamilies.has(family.family);
          const isAdding = addFormFamily === family.family;

          return (
            <section key={family.family} className={styles.familySection}>
              <button
                type="button"
                className={styles.familyHeader}
                onClick={() => toggleFamily(family.family)}
                aria-expanded={isExpanded}
              >
                <span className={styles.familyColor} style={{ backgroundColor: family.variants[0]?.hex || '#888888' }} />
                <span className={styles.familyName}>{family.displayName}</span>
                <span className={styles.variantCount}>{family.variants.length} גוונים</span>
                <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={18} />
              </button>

              {isExpanded && (
                <div className={styles.familyContent}>
                  <div className={styles.variantsTable} role="list">
                    {family.variants.map((variant) => {
                      const isEditing = editing?.family === family.family && editing.variant.name === variant.name;

                      return (
                        <div key={`${family.family}-${variant.name}`} className={styles.variantRow} role="listitem">
                          {isEditing ? (
                            <div className={styles.editForm}>
                              <label className={styles.label}>
                                שם הגוון
                                <input
                                  className={styles.input}
                                  value={editName}
                                  onChange={(event) => setEditName(event.target.value)}
                                  disabled={isSaving}
                                  autoFocus
                                />
                              </label>
                              <label className={styles.label}>
                                קוד צבע
                                <span className={styles.colorField}>
                                  <input
                                    type="color"
                                    className={styles.colorInput}
                                    value={isValidColor(editHex) ? editHex : '#000000'}
                                    onChange={(event) => setEditHex(event.target.value.toUpperCase())}
                                    disabled={isSaving}
                                    aria-label="בחירת צבע"
                                  />
                                  <input
                                    className={`${styles.input} ${styles.hexInput}`}
                                    value={editHex}
                                    onChange={(event) => setEditHex(event.target.value.toUpperCase())}
                                    maxLength={7}
                                    disabled={isSaving}
                                    aria-label="קוד HEX"
                                  />
                                </span>
                              </label>
                              <div className={styles.editActions}>
                                <Button variant="primary" size="sm" onClick={handleEdit} disabled={isSaving}>שמור</Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={isSaving}>ביטול</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className={styles.variantColor} style={{ backgroundColor: variant.hex }} aria-hidden="true" />
                              <span className={styles.variantName}>{variant.displayName || variant.name}</span>
                              <code className={styles.variantHex}>{variant.hex}</code>
                              <div className={styles.variantActions}>
                                <Button variant="ghost" size="xs" onClick={() => startEditing(family.family, variant)} disabled={isSaving} title="עריכת גוון">
                                  <Icon name="Edit" size={15} />
                                </Button>
                                <Button variant="ghost" size="xs" onClick={() => void handlePreDelete(family.family, variant)} disabled={isSaving} title="מחיקת גוון">
                                  <Icon name="Trash2" size={15} />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isAdding ? (
                    <div className={styles.addForm}>
                      <input
                        className={styles.input}
                        placeholder="שם גוון, למשל כחול כהה"
                        value={addName}
                        onChange={(event) => setAddName(event.target.value)}
                        disabled={isSaving}
                      />
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={addHex}
                        onChange={(event) => setAddHex(event.target.value.toUpperCase())}
                        disabled={isSaving}
                        aria-label="בחירת צבע לגוון החדש"
                      />
                      <input
                        className={`${styles.input} ${styles.hexInput}`}
                        value={addHex}
                        onChange={(event) => setAddHex(event.target.value.toUpperCase())}
                        maxLength={7}
                        disabled={isSaving}
                        aria-label="קוד HEX לגוון החדש"
                      />
                      <div className={styles.addActions}>
                        <Button variant="primary" size="sm" onClick={() => void handleAdd(family.family)} disabled={isSaving}>הוסף</Button>
                        <Button variant="ghost" size="sm" onClick={() => setAddFormFamily(null)} disabled={isSaving}>ביטול</Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.addButton}
                      onClick={() => {
                        setEditing(null);
                        setAddFormFamily(family.family);
                      }}
                      disabled={isSaving}
                    >
                      <Icon name="Plus" size={15} /> הוסף גוון
                    </Button>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {!loading && families.length === 0 && (
          <div className={styles.emptyState}>לא נמצאו משפחות צבע.</div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          isOpen
          title="מחיקת גוון"
          message={
            deleteUsageCount > 0
              ? `הגוון „${deleteTarget.variant.name}” נמצא בשימוש ב־${deleteUsageCount} מוצרים. למחוק אותו מרשימת הגוונים?`
              : `למחוק את הגוון „${deleteTarget.variant.name}”?`
          }
          confirmText="מחק"
          cancelText="ביטול"
          variant="danger"
          isLoading={isSaving}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Modal>
  );
};

export default ColorVariantsModal;
