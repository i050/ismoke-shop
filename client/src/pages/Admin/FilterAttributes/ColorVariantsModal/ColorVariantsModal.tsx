/**
 * ColorVariantsModal — ניהול גוונים בתוך משפחת צבע
 * מאפשר הוספה, עריכה ומחיקה של גוונים (שם + HEX)
 */

import React, { useState, useEffect, useCallback } from 'react';
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

/** גוון בודד */
interface VariantEntry {
  name: string;
  hex: string;
}

const ColorVariantsModal: React.FC<ColorVariantsModalProps> = ({ attribute, onClose }) => {
  const { showToast } = useToast();

  const [families, setFamilies] = useState<ColorFamily[]>(attribute.colorFamilies || []);
  const [loading, setLoading] = useState(false);

  // 🆕 state לטופס עריכה
  const [editing, setEditing] = useState<{ family: string; variant: VariantEntry } | null>(null);
  const [editName, setEditName] = useState('');
  const [editHex, setEditHex] = useState('#000000');

  // 🆕 state לטופס הוספה — לפי משפחה ספציפית
  const [addFormFamily, setAddFormFamily] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addHex, setAddHex] = useState('#000000');

  // 🆕 state למחיקה
  const [deleteTarget, setDeleteTarget] = useState<{ family: string; variant: VariantEntry } | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);

  // 🆕 state להרחבה/כיווץ של משפחות
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  /** טעינת נתונים מהשרת */
  const loadFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await FilterAttributeService.getAllColorFamilies();
      setFamilies(data);
    } catch {
      showToast('error', 'שגיאה בטעינת משפחות צבע');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (families.length === 0) loadFamilies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** הוספת גוון */
  const handleAdd = async (family: string) => {
    if (!addName.trim() || !addHex) {
      showToast('warning', 'יש למלא שם גוון וקוד צבע');
      return;
    }
    try {
      await FilterAttributeService.addColorVariant(family, addName.trim(), addHex);
      showToast('success', `גוון "${addName}" נוסף בהצלחה`);
      setAddName('');
      setAddHex('#000000');
      setAddFormFamily(null);
      await loadFamilies();
    } catch (err: any) {
      showToast('error', err.message || 'שגיאה בהוספת גוון');
    }
  };

  /** עריכת גוון */
  const handleEdit = async () => {
    if (!editing) return;
    if (!editName.trim() || !editHex) {
      showToast('warning', 'יש למלא שם גוון וקוד צבע');
      return;
    }
    try {
      await FilterAttributeService.updateColorVariant(
        editing.family, editing.variant.name,
        { name: editName.trim(), hex: editHex }
      );
      showToast('success', `גוון "${editName}" עודכן בהצלחה`);
      setEditing(null);
      await loadFamilies();
    } catch (err: any) {
      showToast('error', err.message || 'שגיאה בעדכון גוון');
    }
  };

  /** בדיקת שימוש לפני מחיקה */
  const handlePreDelete = async (family: string, variant: VariantEntry) => {
    try {
      const count = await FilterAttributeService.getColorVariantUsage(family, variant.name);
      setDeleteUsageCount(count);
      setDeleteTarget({ family, variant });
    } catch {
      setDeleteTarget({ family, variant });
    }
  };

  /** מחיקת גוון */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await FilterAttributeService.deleteColorVariant(deleteTarget.family, deleteTarget.variant.name);
      showToast('success', `גוון "${deleteTarget.variant.name}" נמחק`);
      setDeleteTarget(null);
      await loadFamilies();
    } catch (err: any) {
      showToast('error', err.message || 'שגיאה במחיקת גוון');
    }
  };

  const toggleFamily = (family: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      next.has(family) ? next.delete(family) : next.add(family);
      return next;
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`🎨 ניהול גוונים — ${attribute.name}`} size="large">
      <div className={styles.container}>
        {loading && <p className={styles.loading}>טוען...</p>}

        {families.map(fam => {
          const isExpanded = expandedFamilies.has(fam.family);
          return (
            <div key={fam.family} className={styles.familySection}>
              <div className={styles.familyHeader} onClick={() => toggleFamily(fam.family)}>
                <span className={styles.familyColor} style={{ backgroundColor: fam.variants[0]?.hex || '#888' }} />
                <h3 className={styles.familyName}>{fam.displayName} ({fam.variants?.length || 0} גוונים)</h3>
                <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={18} />
              </div>

              {isExpanded && (
                <>
                  <div className={styles.variantsTable}>
                    {fam.variants?.map(v => (
                      <div key={`${fam.family}-${v.name}`} className={styles.variantRow}>
                        <span className={styles.variantColor} style={{ backgroundColor: v.hex }} />
                        <span className={styles.variantName}>{v.name}</span>
                        <code className={styles.variantHex}>{v.hex}</code>
                        <div className={styles.variantActions}>
                          <Button variant="ghost" size="xs" onClick={() => {
                            setEditing({ family: fam.family, variant: v });
                            setEditName(v.name);
                            setEditHex(v.hex);
                          }} title="ערוך גוון">
                            <Icon name="Edit" size={14} />
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => handlePreDelete(fam.family, v)} title="מחק גוון">
                            <Icon name="Trash2" size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {addFormFamily === fam.family ? (
                    <div className={styles.addForm}>
                      <input
                        className={styles.input}
                        placeholder="שם גוון"
                        value={addName}
                        onChange={e => setAddName(e.target.value)}
                      />
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={addHex}
                        onChange={e => setAddHex(e.target.value)}
                      />
                      <Button variant="primary" size="sm" onClick={() => handleAdd(fam.family)}>שמור</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setAddFormFamily(null); setAddName(''); }}>בטל</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className={styles.addButton} onClick={() => setAddFormFamily(fam.family)}>
                      <Icon name="Plus" size={14} /> הוסף גוון
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* מודאל עריכת גוון */}
      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title={`עריכת גוון — ${editing.variant.name}`} size="small">
          <div className={styles.editForm}>
            <label className={styles.label}>שם גוון</label>
            <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} />
            <label className={styles.label}>קוד צבע</label>
            <input type="color" className={styles.colorInput} value={editHex} onChange={e => setEditHex(e.target.value)} />
            <div className={styles.editActions}>
              <Button variant="primary" onClick={handleEdit}>שמור שינויים</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>בטל</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ConfirmDialog למחיקה */}
      {deleteTarget && (
        <ConfirmDialog
          title="מחיקת גוון"
          message={
            deleteUsageCount > 0
              ? `הגוון "${deleteTarget.variant.name}" נמצא בשימוש ב-${deleteUsageCount} מוצרים. האם אתה בטוח שברצונך למחוק אותו?`
              : `האם אתה בטוח שברצונך למחוק את הגוון "${deleteTarget.variant.name}"?`
          }
          confirmText="מחק"
          cancelText="בטל"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Modal>
  );
};

export default ColorVariantsModal;
