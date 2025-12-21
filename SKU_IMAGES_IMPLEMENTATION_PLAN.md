# 📸 תכנית יישום - ניהול תמונות לוריאנטים (SKUs)

## 🎯 מטרת המסמך
מסמך זה מפרט את התכנית המלאה ליישום מערכת ניהול תמונות עבור וריאנטים (SKUs) בממשק הניהול.

---

## 📋 סקירת התכונה

### מה אנחנו בונים?
מערכת שמאפשרת למנהל לערוך תמונות של כל וריאנט (SKU) בנפרד דרך Modal ייעודי.

### Flow למשתמש:
1. **מנהל רואה בטבלת SKUs** → תמונה ראשונה של כל וריאנט + אייקון עריכה (✏️)
2. **לחיצה על אייקון עריכה** → נפתח Modal עם ניהול תמונות מלא
3. **בתוך ה-Modal:**
   - למעלה: אזור העלאת תמונות חדשות (Drag & Drop)
   - למטה: גלריה של תמונות קיימות
   - כל תמונה: כפתור פח (🗑️) בפינה ימנית עליונה
4. **לחיצה על פח** → תמונה נעשית בהירה + פח משתנה לשיחזור (↻)
5. **לחיצה על שיחזור** → מבטל את הסימון למחיקה
6. **לחיצה על "שמור"** → מעלה תמונות חדשות + מוחק מסומנות + סוגר Modal

### עקרונות UX:
- ✅ **Progressive Disclosure** - הטבלה נקייה, פרטים רק במודאל
- ✅ **Soft Delete** - אפשרות לבטל לפני שמירה סופית
- ✅ **Visual Feedback** - תמונה בהירה + החלפת אייקון
- ✅ **Bulk Actions** - אפשר לסמן כמה תמונות בבת אחת
- ✅ **Confirmation** - אישור נוסף למניעת טעויות

---

## 🏗️ ארכיטקטורה

### קומפוננטות קיימות שנשתמש בהן:
```
✅ Modal (client/src/components/ui/Modal/)
✅ ImageUploader (client/src/components/ui/ImageUploader/)
✅ ConfirmDialog (client/src/components/ui/ConfirmDialog/)
✅ SKURow (ProductForm/ProductSKUs/SKURow.tsx)
✅ ProductSKUs (ProductForm/ProductSKUs/ProductSKUs.tsx)
```

### קומפוננטה חדשה שניצור:
```
🆕 SKUImageManager (ProductForm/ProductSKUs/SKUImageManager.tsx)
🆕 SKUImageManager.module.css
```

### מבנה התיקיות:
```
client/src/components/features/admin/Products/ProductForm/ProductSKUs/
├── ProductSKUs.tsx                    [קיים]
├── ProductSKUs.module.css             [קיים]
├── SKURow.tsx                         [קיים - נעדכן]
├── SKURow.module.css                  [קיים - נעדכן]
├── AddSKUModal.tsx                    [קיים]
├── AddSKUModal.module.css             [קיים]
├── SKUImageManager.tsx                [🆕 חדש]
├── SKUImageManager.module.css         [🆕 חדש]
└── index.ts                           [קיים - נעדכן]
```

---

## 📝 שלב 1: יצירת קומפוננטת SKUImageManager

### 1.1 קובץ: `SKUImageManager.tsx`

#### Props Interface:
```typescript
interface SKUImageManagerProps {
  // בקרת Modal
  isOpen: boolean;
  onClose: () => void;
  
  // נתוני SKU
  skuName: string;              // שם הוריאנט (לכותרת)
  skuCode: string;              // קוד SKU (לזיהוי)
  images: IImage[];             // תמונות קיימות
  
  // פעולות
  onSave: (images: IImage[]) => Promise<void>;
  
  // הגדרות
  maxImages?: number;           // ברירת מחדל: 10
  maxFileSize?: number;         // ברירת מחדל: 5MB
}
```

#### State Management:
```typescript
// תמונות חדשות שהועלו (עדיין לא נשמרו)
const [newImages, setNewImages] = useState<IImage[]>([]);

// Set של public_id של תמונות מסומנות למחיקה
const [imagesToDelete, setImagesToDelete] = useState<Set<string>>(new Set());

// סטטוס שמירה
const [isSaving, setIsSaving] = useState(false);

// סטטוס העלאה
const [isUploading, setIsUploading] = useState(false);
// מצב העלאה מפורט - מאפשר להציג קבצים נוכחיים/סך הקבצים ואחוז
const [uploadProgress, setUploadProgress] = useState<{
  current: number;
  total: number;
  percent: number;
  currentFile?: string;
} | null>(null);

// Confirmation Dialog
const [showConfirmation, setShowConfirmation] = useState(false);

// שגיאות
const [error, setError] = useState<string>('');
```

#### פונקציות מרכזיות:

**1. טיפול בהעלאת תמונות:**
```typescript
const handleUpload = async (files: File[]) => {
  setError('');
  
  // בדיקת מספר תמונות מקסימלי
  const totalImages = images.length + newImages.length + files.length;
  if (totalImages > maxImages) {
    setError(`ניתן להעלות עד ${maxImages} תמונות בלבד`);
    return;
  }
  
  setIsUploading(true);
  setUploadProgress(0);
  
    try {
      // המרה/העלאה לכל קובץ בנפרד עם טיפול שגיאות מקומי לכל קובץ
      const uploadedImages: IImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // כאן ניתן להחליף ל-uploadToCloudinary בעתיד
          const base64 = await fileToBase64(file);

          uploadedImages.push({
            url: base64,
            public_id: `temp_${Date.now()}_${i}`,
            format: file.type.split('/')[1],
          });

          // עדכון פרוגרס מפורט
          setUploadProgress({
            current: i + 1,
            total: files.length,
            percent: Math.round(((i + 1) / files.length) * 100),
            currentFile: file.name,
          });
        } catch (fileErr: any) {
          // טיפול שגיאות גרנולרי לפי סוג השגיאה (דוגמאות)
          console.error('שגיאה בהעלאת קובץ:', file.name, fileErr);
          if (fileErr?.code === 'FILE_TOO_LARGE' || (fileErr?.message || '').includes('size')) {
            setError(`הקובץ ${file.name} גדול מדי (מקסימום ${maxFileSize / 1024 / 1024}MB)`);
          } else if (fileErr?.code === 'INVALID_FORMAT' || (fileErr?.message || '').includes('type')) {
            setError(`פורמט ${file.type || file.name} לא נתמך`);
          } else if (fileErr?.name === 'NetworkError') {
            setError('שגיאת רשת - בדוק את החיבור ונסה שוב');
          } else {
            setError(`שגיאה בהעלאת הקובץ ${file.name}`);
          }
          // המשך הלולאה כדי לנסות שאר הקבצים
        }
      }

      // הוספה לתמונות החדשות (אלו שהועלו בהצלחה)
      setNewImages(prev => [...prev, ...uploadedImages]);
    } catch (err) {
      // שגיאה כללית לא צפויה
      console.error('שגיאה כללית בזמן העלאה:', err);
      setError('שגיאה בהעלאת תמונות. אנא נסה שוב.');
    } finally {
      setIsUploading(false);
      // איפוס פרוגרס לאחר סיום
      setUploadProgress(null);
    }
};
```

**2. סימון/ביטול למחיקה:**
```typescript
const toggleDelete = (publicId: string) => {
  setImagesToDelete(prev => {
    const updated = new Set(prev);
    if (updated.has(publicId)) {
      updated.delete(publicId); // ביטול סימון
    } else {
      updated.add(publicId);    // סימון למחיקה
    }
    return updated;
  });
};
```

**3. מחיקת תמונה חדשה (שטרם נשמרה):**
```typescript
const removeNewImage = (index: number) => {
  setNewImages(prev => prev.filter((_, i) => i !== index));
};
```

**4. שמירה:**
```typescript
const handleSave = async () => {
  setIsSaving(true);
  setError('');
  
  try {
    // סינון תמונות קיימות (הסרת מסומנות למחיקה)
    const remainingImages = images.filter(
      img => !imagesToDelete.has(img.public_id)
    );
    
    // שילוב עם תמונות חדשות
    const finalImages = [...remainingImages, ...newImages];
    
    // שמירה (מעביר למעלה ל-SKURow)
    await onSave(finalImages);
    
    // איפוס State
    setNewImages([]);
    setImagesToDelete(new Set());
    setShowConfirmation(false);
    
    // סגירת Modal
    onClose();
  } catch (err) {
    setError('שגיאה בשמירת תמונות');
    console.error(err);
  } finally {
    setIsSaving(false);
  }
};
```

**5. לחיצה על "שמור שינויים":**
```typescript
const handleSaveClick = () => {
  // אם יש תמונות מסומנות למחיקה - הצג Confirmation
  if (imagesToDelete.size > 0) {
    setShowConfirmation(true);
  } else {
    // אין תמונות למחיקה - שמור ישירות
    handleSave();
  }
};
```

**6. ביטול:**
```typescript
const handleCancel = () => {
  // איפוס כל השינויים
  setNewImages([]);
  setImagesToDelete(new Set());
  setError('');
  onClose();
};
```

#### מבנה JSX:

```tsx
<Modal
  isOpen={isOpen}
  onClose={handleCancel}
  title={`📸 ניהול תמונות - ${skuName}`}
  size="large"
  closeOnOverlayClick={false}
>
  <div className={styles.container}>
    
    {/* אזור העלאה */}
    <section className={styles.uploadSection}>
      <h4 className={styles.sectionTitle}>📤 העלה תמונות חדשות</h4>
      <div className={styles.uploadZone}>
        {/* רכיב drag & drop פשוט */}
      </div>
      {/* הצגת פרוגרס מפורט עם aria-live ל-SR */}
      {uploadProgress && (
        <div className={styles.progressContainer} role="status" aria-live="polite">
          <div className={styles.progressMeta}>
            <span>{uploadProgress.current}/{uploadProgress.total}</span>
            <span>{uploadProgress.currentFile}</span>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </div>
      )}
    </section>

    {/* קו מפריד */}
    <div className={styles.divider} />

    {/* גלריית תמונות קיימות */}
    {images.length > 0 && (
      <section className={styles.gallerySection}>
        <h4 className={styles.sectionTitle}>
          תמונות קיימות ({images.length})
        </h4>
        <div className={styles.gallery}>
          {images.map((image, index) => {
            const isMarked = imagesToDelete.has(image.public_id);
            return (
              <div
                key={image.public_id}
                className={`${styles.imageCard} ${
                  isMarked ? styles.markedForDeletion : ''
                }`}
              >
                <img 
                  src={image.url} 
                  alt={`תמונה ${index + 1}`}
                  className={styles.image}
                />
                
                {/* אינדיקטור מיקום */}
                <div className={styles.imageIndex}>{index + 1}</div>
                
                {/* כפתור מחיקה/שיחזור */}
                <button
                  type="button"
                  className={`${styles.actionButton} ${
                    isMarked ? styles.undoButton : styles.deleteButton
                  }`}
                  onClick={() => toggleDelete(image.public_id)}
                  title={isMarked ? 'שחזר' : 'מחק'}
                >
                  {isMarked ? '↻' : '🗑️'}
                </button>
                
                {/* תווית "ראשי" לתמונה הראשונה */}
                {index === 0 && !isMarked && (
                  <div className={styles.primaryBadge}>⭐ ראשי</div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    )}

    {/* גלריית תמונות חדשות */}
    {newImages.length > 0 && (
      <section className={styles.gallerySection}>
        <h4 className={styles.sectionTitle}>
          תמונות חדשות ({newImages.length})
        </h4>
        <div className={styles.gallery}>
          {newImages.map((image, index) => (
            <div key={image.public_id} className={styles.imageCard}>
              <img 
                src={image.url} 
                alt={`תמונה חדשה ${index + 1}`}
                className={styles.image}
              />
              <div className={styles.newBadge}>חדש</div>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={() => removeNewImage(index)}
                title="הסר"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
    )}

    {/* הודעת שגיאה */}
    {error && (
      <div className={styles.error}>
        <Icon name="AlertTriangle" size={16} />
        <span>{error}</span>
      </div>
    )}

    {/* כפתורי פעולה */}
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.cancelButton}
        onClick={handleCancel}
        disabled={isSaving}
      >
        ביטול
      </button>
      <button
        type="button"
        className={styles.saveButton}
        onClick={handleSaveClick}
        disabled={isSaving || isUploading}
      >
        {isSaving ? (
          <>
            <span className={styles.spinner} />
            <span>שומר...</span>
          </>
        ) : (
          'שמור שינויים'
        )}
      </button>
    </div>

  </div>

  {/* Confirmation Dialog */}
  <ConfirmDialog
    isOpen={showConfirmation}
    title="⚠️ אישור מחיקת תמונות"
    message={`אתה עומד למחוק ${imagesToDelete.size} תמונות. האם אתה בטוח?`}
    confirmText="כן, מחק"
    cancelText="ביטול"
    variant="danger"
    onConfirm={handleSave}
    onCancel={() => setShowConfirmation(false)}
  />
</Modal>
```

---

## 🎨 שלב 2: עיצוב CSS - `SKUImageManager.module.css`

### 2.1 Container ראשי:
```css
.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}
```

### 2.2 אזור העלאה:
```css
.uploadSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sectionTitle {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.uploadZone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  background: var(--color-background-light);
  cursor: pointer;
  transition: all 0.3s ease;
}

.uploadZone:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.uploadZone.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: scale(1.02);
}

.progressBar {
  width: 100%;
  height: 8px;
  background: var(--color-background-dark);
  border-radius: 4px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}
```

### 2.3 קו מפריד:
```css
.divider {
  height: 1px;
  background: var(--color-border);
  margin: 1rem 0;
}
```

### 2.4 גלריה:
```css
.gallerySection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  padding: 0.5rem;
}

/* כרטיס תמונה */
.imageCard {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-background-light);
  border: 2px solid var(--color-border);
  transition: all 0.3s ease;
}

.imageCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

/* תמונה מסומנת למחיקה */
.imageCard.markedForDeletion {
  opacity: 0.3;
  filter: grayscale(100%);
  border-color: var(--color-danger);
}

.imageCard.markedForDeletion:hover {
  transform: none;
  opacity: 0.4;
}

/* התמונה עצמה */
.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* אינדיקטור מיקום */
.imageIndex {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* כפתור פעולה (פח/שיחזור) */
.actionButton {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

/* כפתור מחיקה - אדום */
.deleteButton {
  background: rgba(220, 38, 38, 0.9);
  color: white;
}

.deleteButton:hover {
  background: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}

/* כפתור שיחזור - ירוק */
.undoButton {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.undoButton:hover {
  background: rgba(34, 197, 94, 1);
  transform: scale(1.1);
}

/* תווית "ראשי" */
.primaryBadge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* תווית "חדש" */
.newBadge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

### 2.5 כפתורי פעולה:
```css
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.cancelButton,
.saveButton {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancelButton {
  background: var(--color-background-dark);
  color: var(--color-text-primary);
}

.cancelButton:hover {
  background: var(--color-background-darker);
}

.saveButton {
  background: var(--color-primary);
  color: white;
}

.saveButton:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.saveButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 2.6 הודעת שגיאה:
```css
.error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: 8px;
  color: var(--color-danger);
  font-size: 0.875rem;
}
```

### 2.7 Responsive:
```css
@media (max-width: 768px) {
  .gallery {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
  }
  
  .actions {
    flex-direction: column-reverse;
  }
  
  .cancelButton,
  .saveButton {
    width: 100%;
    justify-content: center;
  }
}
```

---

## 🔧 שלב 3: עדכון SKURow

### 3.1 הוספת State:
```typescript
// בתוך קומפוננטת SKURow
const [showImageManager, setShowImageManager] = useState(false);
```

### 3.2 עדכון עמודת "תמונות" - מצב תצוגה:

**לפני:**
```tsx
{/* תמונות */}
<td className={styles.cell}>
  {sku.images && sku.images.length > 0 ? (
    <div className={styles.imagesPreview}>
      <img
        src={typeof sku.images[0] === 'string' ? sku.images[0] : (sku.images[0] as any)?.url}
        alt={sku.name}
        className={styles.imageThumbnail}
      />
      {sku.images.length > 1 && (
        <span className={styles.imageCount}>+{sku.images.length - 1}</span>
      )}
    </div>
  ) : (
    <span className={styles.noImage}>אין תמונה</span>
  )}
</td>
```

**אחרי:**
```tsx
{/* תמונות */}
<td className={styles.cell}>
  <div className={styles.imageWrapper}>
    {sku.images && sku.images.length > 0 ? (
      <div className={styles.imagesPreview}>
        <img
          src={typeof sku.images[0] === 'string' ? sku.images[0] : (sku.images[0] as any)?.url}
          alt={sku.name}
          className={styles.imageThumbnail}
        />
        {sku.images.length > 1 && (
          <span className={styles.imageCount}>+{sku.images.length - 1}</span>
        )}
        {/* כפתור עריכה צף */}
        <button
          type="button"
          className={styles.editImageButton}
          onClick={(e) => {
            e.stopPropagation();
            setShowImageManager(true);
          }}
          aria-label={`ערוך ${sku.images?.length || 0} תמונות של ${sku.name}`}
          title="ערוך תמונות"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
    ) : (
      <div className={styles.noImageWrapper}>
        <span className={styles.noImage}>אין תמונה</span>
        <button
          type="button"
          className={styles.addImageButton}
          onClick={(e) => {
            e.stopPropagation();
            setShowImageManager(true);
          }}
          title="הוסף תמונות"
        >
          +
        </button>
      </div>
    )}
  </div>
</td>
```

### 3.3 הוספת SKUImageManager (בסוף הקומפוננטה):
```tsx
{/* Modal לניהול תמונות */}
<SKUImageManager
  isOpen={showImageManager}
  onClose={() => setShowImageManager(false)}
  skuName={sku.name}
  skuCode={sku.sku}
  images={sku.images || []}
  onSave={async (newImages) => {
    onChange(index, 'images', newImages);
    setShowImageManager(false);
  }}
  maxImages={10}
/>
```

### 3.4 Import החדש:
```typescript
import SKUImageManager from './SKUImageManager';
```

---

## 🎨 שלב 4: CSS ל-SKURow

### 4.1 הוספה ל-`SKURow.module.css`:

```css
/* Wrapper לתמונות */
.imageWrapper {
  position: relative;
  display: inline-block;
}

/* Preview של תמונות */
.imagesPreview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Thumbnail של תמונה */
.imageThumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  transition: all 0.2s ease;
}

.imageThumbnail:hover {
  border-color: var(--color-primary);
}

/* מונה תמונות */
.imageCount {
  position: absolute;
  bottom: -4px;
  right: -4px;
  padding: 2px 6px;
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* כפתור עריכה צף */
.editImageButton {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 1;
}

.imagesPreview:hover .editImageButton {
  opacity: 1;
}

.editImageButton:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

/* מצב "אין תמונה" */
.noImageWrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.noImage {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}

.addImageButton {
  width: 32px;
  height: 32px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: 2px dashed var(--color-primary);
  border-radius: 8px;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.addImageButton:hover {
  background: var(--color-primary);
  color: white;
  transform: scale(1.05);
}
```

---

## 📦 שלב 5: עדכון index.ts

### 5.1 קובץ: `ProductSKUs/index.ts`

**הוספת export:**
```typescript
export { default } from './ProductSKUs';
export { default as SKURow } from './SKURow';
export { default as AddSKUModal } from './AddSKUModal';
export { default as SKUImageManager } from './SKUImageManager'; // 🆕 חדש
```

---

## 🧪 שלב 6: בדיקות

### 6.1 תרחישי בדיקה:

#### Test Case 1: פתיחת Modal
```
✅ לחיצה על אייקון עריכה → Modal נפתח
✅ כותרת מציגה שם SKU נכון
✅ תמונות קיימות מוצגות
✅ אזור העלאה פעיל
```

#### Test Case 2: העלאת תמונות
```
✅ גרירת קבצים → תמונות מוצגות בסקציה "תמונות חדשות"
✅ Progress bar מוצג במהלך העלאה
✅ תמונות מעל maxImages → הודעת שגיאה
✅ פורמט לא נתמך → הודעת שגיאה
```

#### Test Case 3: Soft Delete
```
✅ לחיצה על 🗑️ → תמונה בהירה + אייקון משתנה ל-↻
✅ לחיצה על ↻ → תמונה חוזרת לרגיל
✅ אפשר לסמן מספר תמונות
✅ תמונה ראשונה מסומנת → תווית "ראשי" נעלמת
```

#### Test Case 4: שמירה
```
✅ אין תמונות מסומנות → שמירה ישירה
✅ יש תמונות מסומנות → Confirmation Dialog
✅ אישור ב-Confirmation → תמונות נמחקות + Modal נסגר
✅ ביטול ב-Confirmation → חזרה ל-Modal
✅ לחיצה על "ביטול" → כל השינויים מתבטלים
```

#### Test Case 5: אינטגרציה
```
✅ שמירה ב-Modal → עדכון בטבלה
✅ Thumbnail בטבלה משתנה
✅ מונה תמונות מתעדכן
✅ שמירת המוצר → תמונות נשמרות בשרת
```

---

## 🔄 שלב 7: אינטגרציה עם Backend (עתידי)

### 7.1 עדכון נדרש ב-`handleUpload`:

**במקום Mock (Base64):**
```typescript
const uploadedImages: IImage[] = [];
for (const file of files) {
  const base64 = await fileToBase64(file);
  uploadedImages.push({
    url: base64,
    public_id: `temp_${Date.now()}`,
  });
}
```

**עתידי (Cloudinary):**
```typescript
import { uploadToCloudinary } from '@/services/imageService';

const uploadedImages: IImage[] = [];
for (const file of files) {
  const result = await uploadToCloudinary(file, {
    folder: `products/skus/${skuCode}`,
  });
  uploadedImages.push({
    url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  });
}
```

### 7.2 עדכון נדרש ב-`handleSave`:

**עתידי (מחיקה מCloudinary):**
```typescript
import { deleteFromCloudinary } from '@/services/imageService';

// לפני השמירה - מחיקת תמונות מCloudinary
for (const publicId of imagesToDelete) {
  if (!publicId.startsWith('temp_')) {
    await deleteFromCloudinary(publicId);
  }
}
```

---

## ✅ סיכום התכנית

### קבצים שייווצרו:
```
🆕 SKUImageManager.tsx           (~400 שורות)
🆕 SKUImageManager.module.css    (~300 שורות)
```

### קבצים שיעודכנו:
```
✏️ SKURow.tsx                    (+50 שורות)
✏️ SKURow.module.css             (+80 שורות)
✏️ index.ts                       (+1 שורה)
```

### תלויות:
- ✅ Modal (קיים)
- ✅ ConfirmDialog (קיים)
- ✅ Icon (קיים)
- ✅ IImage type (קיים)

### זמן משוער:
- קוד: ~3-4 שעות
- בדיקות: ~1-2 שעות
- **סה"כ: ~5-6 שעות**

---

## 📚 נספחים

### A. Helper Functions

**המרת File ל-Base64:**
```typescript
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
```

### B. Type Definitions

```typescript
// IImage (כבר קיים ב-types/Product.ts)
interface IImage {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
}

// SKUFormData (כבר קיים ב-schemas/productFormSchema.ts)
interface SKUFormData {
  sku: string;
  name: string;
  price?: number | null;
  stockQuantity: number;
  attributes?: {
    color?: string;
    size?: string;
    [key: string]: string | undefined;
  };
  images: IImage[];
  isActive: boolean;
}
```

---

## 🎯 סיום

תכנית זו מספקת מערכת ניהול תמונות מקצועית ומשתמשת בכל הקומפוננטות הקיימות בפרויקט.

**עקרונות מנחים:**
- ✅ שימוש חוזר בקומפוננטות
- ✅ עקביות עם ה-UI הקיים
- ✅ UX מצוין (Progressive Disclosure + Soft Delete)
- ✅ בטיחות (Confirmation)
- ✅ Performance (אופטימיזציה)

**מוכן ליישום!** 🚀
