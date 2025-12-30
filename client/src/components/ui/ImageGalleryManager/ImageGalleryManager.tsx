// Image Gallery Manager - קומפוננטה משותפת לניהול גלריות תמונות
// תומכת במצב inline (למוצרים) ומצב modal (ל-SKUs)
// שומרת על כל הלוגיקה המקורית של שתי הקומפוננטות

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import { Icon } from '../Icon';
import { Button } from '../Button';
import { useConfirm } from '../../../hooks/useConfirm';
import { getImageUrl } from '../../../utils/imageUtils'; // ✅ ייבוא הפונקציה החדשה
import styles from './ImageGalleryManager.module.css';

/**
 * Image type - תואם ל-IImage מ-Product types
 */
export interface ImageObject {
  url: string;
  public_id: string;
  format?: string;
  width?: number;
  height?: number;
}

/**
 * מצב תצוגה
 */
export type DisplayMode = 'inline' | 'modal';

/**
 * מצב מחיקה
 */
export type DeleteMode = 'immediate' | 'soft';

/**
 * Props Interface
 */
export interface ImageGalleryManagerProps {
  // === מצב תצוגה ===
  mode: DisplayMode;           // inline = בתוך הדף, modal = חלון צף
  
  // === נתונים ===
  images: ImageObject[];       // תמונות קיימות
  onChange: (images: ImageObject[]) => void;  // callback עדכון תמונות
  
  // === תכונות ===
  allowReorder?: boolean;      // אפשר שינוי סדר? (default: true ב-inline, false ב-modal)
  deleteMode?: DeleteMode;     // immediate = מחיקה מיידית, soft = סימון למחיקה (default: immediate ב-inline, soft ב-modal)
  showProgress?: boolean;      // הצג progress bar? (default: true)
  showPrimaryBadge?: boolean;  // הצג תווית "ראשי" לתמונה הראשונה? (default: true)
  maxImages?: number;          // מספר תמונות מקסימלי (default: 10)
  maxFileSize?: number;        // גודל קובץ מקסימלי בבתים (default: 5MB)
  
  // === Modal Props (רק אם mode='modal') ===
  isOpen?: boolean;            // האם המודאל פתוח?
  onClose?: () => void;        // callback לסגירת המודאל
  title?: string;              // כותרת המודאל
  
  // === Callbacks ===
  onUpload?: (files: File[]) => Promise<ImageObject[]>;  // פונקציה מותאמת להעלאה (אופציונלי)
  
  // === שגיאות ===
  errors?: {
    images?: string;
  };
}

/**
 * Interface למעקב אחרי התקדמות העלאה
 */
interface UploadProgress {
  current: number;
  total: number;
  percent: number;
  currentFile?: string;
}

/**
 * קומפוננטה משותפת לניהול גלריות תמונות
 * משמשת גם את ProductImages (inline) וגם את SKUImageManager (modal)
 */
const ImageGalleryManager: React.FC<ImageGalleryManagerProps> = ({
  mode,
  images,
  onChange,
  allowReorder = mode === 'inline',     // ברירת מחדל: reorder רק ב-inline
  deleteMode = mode === 'inline' ? 'immediate' : 'soft',  // ברירת מחדל לפי mode
  showProgress = true,
  showPrimaryBadge = true,
  maxImages = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  isOpen = true,
  onClose,
  title = 'ניהול תמונות',
  onUpload,
  errors,
}) => {
  // Hook for confirmations
  const confirm = useConfirm();
  
  // ===== State Management =====
  
  // תמונות חדשות (רק למצב soft delete)
  const [newImages, setNewImages] = useState<ImageObject[]>([]);
  
  // Set של אינדקסים מסומנים למחיקה (רק למצב soft delete)
  const [imagesToDelete, setImagesToDelete] = useState<Set<number>>(new Set());
  
  // סטטוסים
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  
  // Confirmation Dialog (רק למצב soft delete)
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // שגיאות
  const [error, setError] = useState<string>('');
  
  // אינדקס תמונה נגררת (למצב reorder)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // איפוס state כשפותחים/סוגרים modal או כש-images משתנה
  useEffect(() => {
    if (mode === 'modal') {
      if (!isOpen) {
        // סגירת modal - איפוס מלא
        setNewImages([]);
        setImagesToDelete(new Set());
        setError('');
        setUploadProgress(null);
      } else {
        // פתיחת modal - איפוס רק של state זמני
        setNewImages([]);
        setImagesToDelete(new Set());
        setError('');
      }
    }
  }, [mode, isOpen]);

  // ===== Helper Functions =====
  
  /**
   * המרת File ל-Base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ===== Upload Logic =====
  
  /**
   * טיפול בהעלאת תמונות
   */
  const handleUpload = useCallback(async (files: File[]) => {
    setError('');
    
    // בדיקת מספר תמונות מקסימלי
    const currentCount = deleteMode === 'soft' 
      ? images.length + newImages.length 
      : images.length;
    
    if (currentCount + files.length > maxImages) {
      setError(`ניתן להעלות עד ${maxImages} תמונות בלבד`);
      return;
    }
    
    setIsUploading(true);
    
    try {
      let imageObjects: ImageObject[];

      if (onUpload) {
        // שימוש בפונקציית upload מותאמת
        // 🔧 הוספת progress tracking גם ל-onUpload
        if (showProgress) {
          setUploadProgress({
            current: 0,
            total: files.length,
            percent: 0,
            currentFile: files[0]?.name,
          });
        }
        
        imageObjects = await onUpload(files);
        
        // עדכון ל-100% בסיום
        if (showProgress) {
          setUploadProgress({
            current: files.length,
            total: files.length,
            percent: 100,
            currentFile: files[files.length - 1]?.name,
          });
          
          // 🎨 המתנה קצרה כדי שהמשתמש יראה את ההצלחה והאנימציות
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Mock data - המרה ל-Base64
        // ⚠️ אזהרה: Base64 יוצר payload גדול! מומלץ להשתמש ב-onUpload עם Cloudinary
        imageObjects = [];
        
        // בדיקת גודל קבצים - הגבלה ל-500KB בגלל Base64
        const maxSizeForBase64 = 500 * 1024; // 500KB
        for (const file of files) {
          if (file.size > maxSizeForBase64) {
            setError(`קובץ ${file.name} גדול מדי (${Math.round(file.size / 1024)}KB). בגלל מגבלות Base64, הגודל המקסימלי הוא 500KB. אנא השתמש בתמונות קטנות יותר או הגדר שירות Cloudinary.`);
            setIsUploading(false);
            return;
          }
        }
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const base64 = await fileToBase64(file);

            imageObjects.push({
              url: base64,
              public_id: `temp_${Date.now()}_${i}`,
              format: file.type.split('/')[1] || 'jpeg',
            });

            // עדכון progress
            if (showProgress) {
              setUploadProgress({
                current: i + 1,
                total: files.length,
                percent: Math.round(((i + 1) / files.length) * 100),
                currentFile: file.name,
              });
            }
          } catch (fileErr: any) {
            console.error('שגיאה בהעלאת קובץ:', file.name, fileErr);
            setError(`שגיאה בהעלאת הקובץ ${file.name}`);
          }
        }
      }

      // עדכון לפי מצב
      if (deleteMode === 'soft') {
        // מצב soft delete - הוספה לרשימת תמונות חדשות
        setNewImages(prev => [...prev, ...imageObjects]);
      } else {
        // מצב immediate - עדכון מיידי
        onChange([...images, ...imageObjects]);
      }
    } catch (err) {
      console.error('שגיאה כללית בהעלאה:', err);
      setError('שגיאה בהעלאת תמונות. אנא נסה שוב.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [images, newImages, deleteMode, maxImages, maxFileSize, showProgress, onUpload, onChange]);

  // ===== Delete Logic =====
  
  /**
   * מחיקה מיידית (immediate mode)
   */
  const handleImmediateDelete = useCallback(async (index: number) => {
    const confirmed = await confirm({
      title: 'מחיקת תמונה',
      message: 'האם אתה בטוח שברצונך למחוק תמונה זו?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      danger: true,
    });
    if (confirmed) {
      const updatedImages = images.filter((_, i) => i !== index);
      onChange(updatedImages);
    }
  }, [images, onChange, confirm]);

  /**
   * סימון למחיקה (soft delete mode)
   */
  const toggleDelete = useCallback((index: number) => {
    setImagesToDelete(prev => {
      const updated = new Set(prev);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return updated;
    });
  }, []);

  /**
   * מחיקת תמונה חדשה (soft delete mode)
   */
  const removeNewImage = useCallback((index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ===== Reorder Logic =====
  
  /**
   * שינוי סדר תמונות (reorder mode)
   */
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (!allowReorder) return;
    
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    onChange(updatedImages);
  }, [images, allowReorder, onChange]);

  const handleDragStart = (index: number) => {
    if (allowReorder) {
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (allowReorder) {
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (allowReorder && draggedIndex !== null && draggedIndex !== toIndex) {
      handleReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
  };

  // ===== Save Logic (soft delete mode) =====
  
  /**
   * שמירה סופית (soft delete mode)
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError('');
    
    try {
      // סינון תמונות קיימות (הסרת מסומנות למחיקה)
      const remainingImages = images.filter((_, index) => !imagesToDelete.has(index));
      
      // שילוב עם תמונות חדשות
      const finalImages = [...remainingImages, ...newImages];
      
      // עדכון - onChange מעביר את התמונות המעודכנות
      onChange(finalImages);
      
      // איפוס
      setNewImages([]);
      setImagesToDelete(new Set());
      setShowConfirmation(false);
      
      // סגירת modal
      if (mode === 'modal' && onClose) {
        onClose();
      }
    } catch (err) {
      console.error('שגיאה בשמירה:', err);
      setError('שגיאה בשמירת תמונות');
    } finally {
      setIsSaving(false);
    }
  }, [images, imagesToDelete, newImages, onChange, mode, onClose]);

  /**
   * לחיצה על "שמור" (soft delete mode)
   */
  const handleSaveClick = useCallback(() => {
    // בדיקה אם יש שינויים בכלל
    const hasChanges = newImages.length > 0 || imagesToDelete.size > 0;
    
    if (!hasChanges) {
      // אין שינויים - סתם סגור את המודאל
      if (mode === 'modal' && onClose) {
        onClose();
      }
      return;
    }
    
    // יש שינויים - שמור
    if (deleteMode === 'soft' && imagesToDelete.size > 0) {
      setShowConfirmation(true);
    } else {
      handleSave();
    }
  }, [deleteMode, imagesToDelete.size, newImages.length, handleSave, mode, onClose]);

  /**
   * ביטול (modal mode)
   */
  const handleCancel = useCallback(() => {
    setNewImages([]);
    setImagesToDelete(new Set());
    setError('');
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // ===== Dropzone =====
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('');

    if (rejectedFiles.length > 0) {
      const firstError = rejectedFiles[0].errors[0];
      const effectiveLimit = onUpload ? maxFileSize : 500 * 1024;
      if (firstError.code === 'file-too-large') {
        const limitText = effectiveLimit >= 1024 * 1024 
          ? `${effectiveLimit / 1024 / 1024}MB` 
          : `${effectiveLimit / 1024}KB`;
        setError(`גודל הקובץ חייב להיות עד ${limitText}${!onUpload ? ' (הגבלת Base64)' : ''}`);
      } else if (firstError.code === 'file-invalid-type') {
        setError('ניתן להעלות רק קבצי תמונה (JPG, PNG, WEBP)');
      } else {
        setError('שגיאה בהעלאת הקובץ');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles);
    }
  }, [handleUpload, maxFileSize, onUpload]);

  const currentImageCount = deleteMode === 'soft' 
    ? images.length + newImages.length 
    : images.length;

  // אם אין onUpload (משתמשים ב-Base64), הגבל לקבצים קטנים
  const effectiveMaxSize = onUpload ? maxFileSize : 500 * 1024; // 500KB for Base64

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: effectiveMaxSize,
    multiple: true,
    disabled: currentImageCount >= maxImages || isUploading,
  });

  // ===== Render Content =====
  
  const renderContent = () => (
    <div className={`${styles.container} ${mode === 'modal' ? styles.modalContainer : styles.inlineContainer}`}>
      {/* אזור העלאה */}
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${
          currentImageCount >= maxImages ? styles.disabled : ''
        } ${isUploading ? styles.uploading : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <>
            <div className={styles.uploadingSpinner}>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerRing}></div>
            </div>
            <p className={styles.dropzoneText}>מעלה תמונות...</p>
            {uploadProgress && (
              <p className={styles.dropzoneSubtext}>
                {uploadProgress.current} מתוך {uploadProgress.total} קבצים ({uploadProgress.percent}%)
              </p>
            )}
          </>
        ) : (
          <>
            <Icon name="Upload" size={48} className={styles.uploadIcon} />
            {isDragActive ? (
              <p className={styles.dropzoneText}>שחרר את הקבצים כאן...</p>
            ) : (
              <>
                <p className={styles.dropzoneText}>
                  גרור קבצים לכאן או לחץ לבחירת קבצים
                </p>
                <p className={styles.dropzoneSubtext}>
                  JPG, PNG או WEBP (עד {effectiveMaxSize >= 1024 * 1024 ? `${effectiveMaxSize / 1024 / 1024}MB` : `${effectiveMaxSize / 1024}KB`})
                  {!onUpload && <span style={{ color: '#f59e0b', display: 'block', fontSize: '0.75rem', marginTop: '0.25rem' }}>⚠️ בגלל Base64, הגבלת גודל: 500KB</span>}
                </p>
              </>
            )}
          </>
        )}
        {currentImageCount >= maxImages && (
          <p className={styles.maxReached}>
            הגעת למספר המקסימלי של תמונות ({maxImages})
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && uploadProgress && (
        <div className={styles.progressContainer}>
          {uploadProgress.currentFile && (
            <div className={styles.progressMeta}>
              <span>{uploadProgress.current}/{uploadProgress.total}</span>
              <span className={styles.progressFile}>{uploadProgress.currentFile}</span>
              <span>{uploadProgress.percent}%</span>
            </div>
          )}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* הצגת שגיאה */}
      {(error || errors?.images) && (
        <div className={styles.error}>
          <Icon name="AlertTriangle" size={16} />
          <span>{error || errors?.images}</span>
        </div>
      )}

      {/* גלריית תמונות */}
      {(images.length > 0 || isUploading) && (
        <div className={styles.imagesGrid}>
          {/* תמונות קיימות */}
          {images.map((image, index) => {
            const isMarked = deleteMode === 'soft' && imagesToDelete.has(index);
            const isDragging = draggedIndex === index;
            
            return (
              <div
                key={`${image.public_id}-${index}`}
                className={`${styles.imageWrapper} ${isDragging ? styles.dragging : ''} ${
                  isMarked ? styles.markedForDeletion : ''
                }`}
                draggable={allowReorder}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* ✅ שימוש ב-getImageUrl עם 'medium' (800×800) לתצוגה בAdmin */}
                <img
                  src={getImageUrl(image, 'medium')}
                  alt={`תמונה ${index + 1}`}
                  className={styles.image}
                />

                {/* אינדיקטור מיקום */}
                <div className={styles.imageIndex}>{index + 1}</div>

                {/* כפתור מחיקה/שיחזור */}
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={`${styles.deleteButton} ${
                    isMarked ? styles.undoButton : ''
                  }`}
                  onClick={() =>
                    deleteMode === 'immediate'
                      ? handleImmediateDelete(index)
                      : toggleDelete(index)
                  }
                  aria-label={
                    isMarked ? `שחזר תמונה ${index + 1}` : `מחק תמונה ${index + 1}`
                  }
                >
                  {isMarked ? <Icon name="Undo" size={16} /> : <Icon name="X" size={16} />}
                </Button>

                {/* תווית "ראשי" */}
                {showPrimaryBadge && index === 0 && !isMarked && (
                  <div className={styles.primaryBadge}>ראשי</div>
                )}
              </div>
            );
          })}
          
          {/* Skeleton placeholders בזמן העלאה - מציג את כמות התמונות שנטענות */}
          {isUploading && uploadProgress && uploadProgress.total > 0 && (
            <>
              {Array.from({ length: uploadProgress.total }).map((_, index) => {
                // אם התמונה כבר הועלתה, לא מציגים skeleton
                if (index < uploadProgress.current) return null;
                
                return (
                  <div key={`skeleton-${index}`} className={`${styles.imageWrapper} ${styles.skeletonWrapper}`}>
                    <div className={styles.skeleton}>
                      <div className={styles.skeletonShimmer}></div>
                      <div className={styles.skeletonIcon}>
                        <Icon name="Image" size={32} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* תמונות חדשות (soft delete mode) */}
      {deleteMode === 'soft' && newImages.length > 0 && (
        <div className={styles.newImagesSection}>
          <h4 className={styles.sectionTitle}>תמונות חדשות ({newImages.length})</h4>
          <div className={styles.imagesGrid}>
            {newImages.map((image, index) => (
              <div key={image.public_id || index} className={styles.imageWrapper}>
                {/* ✅ שימוש ב-getImageUrl עם 'medium' */}
                <img src={getImageUrl(image, 'medium')} alt={`תמונה חדשה ${index + 1}`} className={styles.image} />
                <div className={styles.newBadge}>חדש</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={styles.deleteButton}
                  onClick={() => removeNewImage(index)}
                  aria-label={`הסר תמונה חדשה ${index + 1}`}
                >
                  <Icon name="X" size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* הודעה כשאין תמונות */}
      {images.length === 0 && newImages.length === 0 && (
        <div className={styles.emptyState}>
          <Icon name="Image" size={64} className={styles.emptyIcon} />
          <p className={styles.emptyText}>לא הועלו תמונות עדיין</p>
        </div>
      )}

      {/* כפתורי פעולה (modal mode + soft delete) */}
      {mode === 'modal' && deleteMode === 'soft' && (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={isSaving}
          >
            ביטול
          </Button>
          <Button
            type="button"
            variant="primary"
            className={styles.saveButton}
            onClick={handleSaveClick}
            disabled={isSaving || isUploading}
          >
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      )}
    </div>
  );

  // ===== Render =====
  
  if (mode === 'modal') {
    return (
      <>
        <Modal
          isOpen={isOpen!}
          onClose={handleCancel}
          title={title}
          size="large"
          closeOnOverlayClick={false}
        >
          {renderContent()}
        </Modal>

        {/* Confirmation Dialog */}
        {deleteMode === 'soft' && (
          <ConfirmDialog
            isOpen={showConfirmation}
            title="אישור מחיקת תמונות"
            message={`אתה עומד למחוק ${imagesToDelete.size} תמונות. האם אתה בטוח?`}
            confirmText="כן, מחק"
            cancelText="ביטול"
            variant="danger"
            onConfirm={handleSave}
            onCancel={() => setShowConfirmation(false)}
          />
        )}
      </>
    );
  }

  return renderContent();
};

export default ImageGalleryManager;
