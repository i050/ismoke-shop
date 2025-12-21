import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon } from '../Icon';
import { Button } from '../Button';
import { useConfirm } from '../../../hooks/useConfirm';
import styles from './ImageUploader.module.css';

/**
 * ממשק Props של ImageUploader
 */
export interface ImageUploaderProps {
  /** מערך של URLs של תמונות קיימות */
  images: string[];
  /** פונקציה שנקראת כשמוסיפים תמונות חדשות (mock data בשלב זה) */
  onUpload: (files: File[]) => void;
  /** פונקציה שנקראת כשמוחקים תמונה */
  onDelete: (index: number) => void;
  /** פונקציה שנקראת כשמשנים סדר תמונות */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** מספר מקסימלי של תמונות */
  maxImages?: number;
  /** גודל מקסימלי לקובץ בבתים (ברירת מחדל 5MB) */
  maxFileSize?: number;
  /** האם להציג progress bar */
  showProgress?: boolean;
  /** התקדמות העלאה (0-100) */
  uploadProgress?: number;
}

/**
 * קומפוננטה להעלאת תמונות עם Drag & Drop
 * בשלב זה עובדת עם mock data בלבד
 * העלאה ל-Cloudinary תתווסף ב-Phase 5
 */
const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onUpload,
  onDelete,
  onReorder,
  maxImages = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  showProgress = false,
  uploadProgress = 0,
}) => {
  const confirm = useConfirm();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  /**
   * טיפול בהוספת קבצים
   */
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError('');

      // בדיקת מספר תמונות מקסימלי
      if (images.length + acceptedFiles.length > maxImages) {
        setError(`ניתן להעלות עד ${maxImages} תמונות בלבד`);
        return;
      }

      // בדיקת קבצים שנדחו
      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.code === 'file-too-large') {
          setError(`גודל הקובץ חייב להיות עד ${maxFileSize / 1024 / 1024}MB`);
        } else if (firstError.code === 'file-invalid-type') {
          setError('ניתן להעלות רק קבצי תמונה (JPG, PNG, WEBP)');
        } else {
          setError('שגיאה בהעלאת הקובץ');
        }
        return;
      }

      // העברת הקבצים להורה
      onUpload(acceptedFiles);
    },
    [images.length, maxImages, maxFileSize, onUpload]
  );

  /**
   * הגדרות Dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: maxFileSize,
    multiple: true,
    disabled: images.length >= maxImages,
  });

  /**
   * טיפול במחיקת תמונה
   */
  const handleDelete = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'מחיקת תמונה',
      message: 'האם אתה בטוח שברצונך למחוק תמונה זו?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      danger: true,
    });
    if (confirmed) {
      onDelete(index);
    }
  };

  /**
   * התחלת גרירה של תמונה
   */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /**
   * סיום גרירה של תמונה
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  /**
   * גרירה מעל תמונה אחרת
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /**
   * שחרור תמונה על תמונה אחרת (שינוי סדר)
   */
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className={styles.container}>
      {/* אזור העלאה */}
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${
          images.length >= maxImages ? styles.disabled : ''
        }`}
      >
        <input {...getInputProps()} />
        <Icon name="Upload" size={48} className={styles.uploadIcon} />
        {isDragActive ? (
          <p className={styles.dropzoneText}>שחרר את הקבצים כאן...</p>
        ) : (
          <>
            <p className={styles.dropzoneText}>
              גרור קבצים לכאן או לחץ לבחירת קבצים
            </p>
            <p className={styles.dropzoneSubtext}>
              JPG, PNG או WEBP (עד {maxFileSize / 1024 / 1024}MB)
            </p>
          </>
        )}
        {images.length >= maxImages && (
          <p className={styles.maxReached}>
            הגעת למספר המקסימלי של תמונות ({maxImages})
          </p>
        )}
      </div>

      {/* הצגת שגיאה */}
      {error && (
        <div className={styles.error}>
          <Icon name="AlertTriangle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && uploadProgress > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles.progressText}>{uploadProgress}%</span>
        </div>
      )}

      {/* תצוגת תמונות */}
      {images.length > 0 && (
        <div className={styles.imagesGrid}>
          {images.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className={`${styles.imageWrapper} ${
                draggedIndex === index ? styles.dragging : ''
              }`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* תמונה */}
              <img
                src={imageUrl}
                alt={`תמונה ${index + 1}`}
                className={styles.image}
              />

              {/* אינדיקטור מיקום */}
              <div className={styles.imageIndex}>{index + 1}</div>

              {/* כפתור מחיקה */}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={styles.deleteButton}
                onClick={(e) => handleDelete(index, e)}
                aria-label="מחק תמונה"
              >
                <Icon name="X" size={16} />
              </Button>

              {/* תווית "ראשי" לתמונה הראשונה */}
              {index === 0 && <div className={styles.primaryBadge}>ראשי</div>}
            </div>
          ))}
        </div>
      )}

      {/* הודעה כשאין תמונות */}
      {images.length === 0 && (
        <div className={styles.emptyState}>
          <Icon name="Image" size={64} className={styles.emptyIcon} />
          <p className={styles.emptyText}>לא הועלו תמונות עדיין</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
