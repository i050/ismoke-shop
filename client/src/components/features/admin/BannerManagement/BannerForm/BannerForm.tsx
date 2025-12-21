import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorSelect } from '@/components/ui/ColorSelect';
import { X, Upload, Calendar } from 'lucide-react';
import type { Banner, BannerFormData } from '@/services/bannerService';
import { contrastRatio, normalizeHex, pickBestContrast } from '../../../../../lib/colorUtils';
import { AVAILABLE_COLORS } from '../../../../../utils/colorConstants';
import styles from './BannerForm.module.css';

// פונקציית עזר שממירה ISO לשרשור שמתאים ל-input מסוג datetime-local
const isoToLocalDatetimeValue = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  const localIso = new Date(date.getTime() - timezoneOffsetMs).toISOString();
  return localIso.slice(0, 16);
};

// פונקציית עזר שממירה קלט מהטופס חזרה למחרוזת ISO תקנית
const localDatetimeValueToIso = (value: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

// פונקציית עזר לעיצוב תאריך להצגה למשתמש (עברית)
const formatDisplayDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // מציג תאריך ושעה בפורמט קריא בעברית
  const datePart = d.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
};

// מחזיר טקסט תמציתי לתצוגה למנהל לפי המצבים של start/end
const getDisplayLogic = (
  startIso?: string | null,
  endIso?: string | null
): string => {
  const hasStart = !!startIso;
  const hasEnd = !!endIso;

  if (!hasStart && !hasEnd) {
    return '📌 הבאנר יוצג תמיד';
  }

  if (hasStart && !hasEnd) {
    return `📅 הבאנר יוצג החל מ-${formatDisplayDate(startIso)}`;
  }

  if (!hasStart && hasEnd) {
    return `⏰ הבאנר יוצג עד ${formatDisplayDate(endIso)}`;
  }

  return `📆 הבאנר יוצג בין ${formatDisplayDate(startIso)} ל-${formatDisplayDate(endIso)}`;
};

interface BannerFormProps {
  banner: Banner | null;
  onSave: (data: BannerFormData) => Promise<void>;
  onCancel: () => void;
  onUploadImage: (file: File) => Promise<{ url: string; publicId: string }>;
}

const BannerForm: React.FC<BannerFormProps> = ({
  banner,
  onSave,
  onCancel,
  onUploadImage,
}) => {
  // קומפוננטה שאחראית על טופס יצירה ועריכת באנרים בממשק הניהול
  const [formData, setFormData] = useState<BannerFormData>({
    title: '',
    description: '',
    imageUrl: '',
    imagePublicId: '',
    // ארבעת שדות הצבע החדשים
    titleColor: undefined,
    descriptionColor: undefined,
    ctaTextColor: undefined,
    ctaBackgroundColor: undefined,
    // שדות גודל פונטים (design tokens)
    titleFontSize: undefined,
    descriptionFontSize: undefined,
    ctaFontSize: undefined,
    ctaText: '',
    ctaLink: '',
    order: 0,
    isActive: true,
    startDate: undefined,
    endDate: undefined,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // ניהול tabs (תוכן, עיצוב, CTA, תזמון)
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'cta' | 'timing'>('content');
  
  // שליטה ב-overlay opacity (0-100)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(40);

  useEffect(() => {
    // טוען נתוני באנר קיים לעריכה ומעדכן תצוגה מקדימה
    if (banner) {
      setFormData({
        title: banner.title,
        description: banner.description,
        imageUrl: banner.imageUrl,
        imagePublicId: banner.imagePublicId,
        // טעינת ארבעת שדות הצבע
        titleColor: banner.titleColor ?? undefined,
        descriptionColor: banner.descriptionColor ?? undefined,
        ctaTextColor: banner.ctaTextColor ?? undefined,
        ctaBackgroundColor: banner.ctaBackgroundColor ?? undefined,
        // טעינת שדות גודל פונטים
        titleFontSize: banner.titleFontSize ?? undefined,
        descriptionFontSize: banner.descriptionFontSize ?? undefined,
        ctaFontSize: banner.ctaFontSize ?? undefined,
        // אם באנר קיים והוא מכיל ערך של overlayOpacity - נטען אותו לתצוגה
        // הערך מיוצג כאחוז 0..100 ונשמר ב-state נפרד `overlayOpacity`
        ctaText: banner.ctaText || '',
        ctaLink: banner.ctaLink || '',
        order: banner.order,
        isActive: banner.isActive,
        startDate: banner.startDate,
        endDate: banner.endDate,
      });
      setImagePreview(banner.imageUrl);
      // טען גם את ערך ה-overlay אם קיים בבאנר
      setOverlayOpacity(typeof banner?.overlayOpacity === 'number' ? banner!.overlayOpacity! : 40);
    }
  }, [banner]);

  // Preset colors לשימוש מהיר על ידי המנהל - מומר למבנה של ColorSelect
  const colorPresets = AVAILABLE_COLORS.map(c => ({ hex: c.hex, name: c.name }));
  
  /**
   * פונקציה שמציעה צבע טקסט אופטימלי לפי רקע (WCAG)
   * משתמשת ב-pickBestContrast החדשה מ-colorUtils
   */
  const suggestOptimalTextColor = (bgColor?: string | null): string => {
    if (!bgColor) return '#ffffff';
    const normalized = normalizeHex(bgColor);
    if (!normalized) return '#ffffff';
    
    // מנסה למצוא צבע אופטימלי מתוך הפלטה הקיימת
    const candidates = colorPresets.map(c => c.hex);
    const optimal = pickBestContrast(normalized, candidates, 4.5);
    
    if (optimal) return optimal;
    
    // פתרון גיבוי: בחירה בין שחור/לבן
    const ratioWithWhite = contrastRatio(normalized, '#ffffff');
    const ratioWithBlack = contrastRatio(normalized, '#000000');
    return ratioWithWhite >= ratioWithBlack ? '#ffffff' : '#000000';
  };

  
  // פונקציה שמיישמת הצעת צבע אופטימלי ל-CTA
  const handleSuggestContrast = () => {
    const optimalColor = suggestOptimalTextColor(formData.ctaBackgroundColor);
    setFormData((prev) => ({ ...prev, ctaTextColor: optimalColor }));
  };

  // פונקציה קצרה שמחזירה סטטוס ניגודיות ביחס ל-white/black
  const getContrastStatus = (hex?: string | null) => {
    const normalized = normalizeHex(hex || '');
    if (!normalized) return { label: 'לא הוגדר', code: 'none', bestAgainst: null, ratio: null };
    const ratioWithWhite = contrastRatio(normalized, '#ffffff');
    const ratioWithBlack = contrastRatio(normalized, '#000000');
    const best = Math.max(ratioWithWhite, ratioWithBlack);
    const bestAgainst = ratioWithWhite >= ratioWithBlack ? '#ffffff' : '#000000';
    if (best >= 4.5) return { label: `✓ ניגודיות טובה (${best.toFixed(2)})`, code: 'ok', bestAgainst, ratio: best };
    if (best >= 3.0) return { label: `⚠️ ניגודיות בינונית (${best.toFixed(2)})`, code: 'warn', bestAgainst, ratio: best };
    return { label: `❌ ניגודיות נמוכה (${best.toFixed(2)})`, code: 'bad', bestAgainst, ratio: best };
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // מנהל טרנספורמציה לתאריכים כדי לאחסן ISO ב-state
    if (name === 'startDate' || name === 'endDate') {
      setFormData((prev) => ({
        ...prev,
        [name]: localDatetimeValueToIso(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    // מנקה שגיאה לשדה שעודכן
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // מוודא שסוג הקובץ הוא תמונה
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'נא לבחור קובץ תמונה תקין' }));
      return;
    }

    // בודק שהקובץ קטן מהמגבלה המותרת
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'הקובץ חייב להיות קטן מ-5MB' }));
      return;
    }

    setImageFile(file);
    
    // יוצר תצוגה מקדימה מהקובץ שהועלה
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // מסיר הודעת שגיאה אם קיימת עבור התמונה
    if (errors.image) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.image;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!imagePreview && !banner) {
      newErrors.image = 'חובה להעלות תמונה לבאנר';
    }

    if (formData.ctaLink && !formData.ctaText) {
      newErrors.ctaText = 'יש להזין טקסט לקריאה לפעולה כאשר מוגדר קישור';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'תאריך הסיום חייב להיות מאוחר מתאריך ההתחלה';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      let finalFormData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        // נרמל את כל שדות הצבע לפני שליחה: trim + lowercase או null אם לא הוגדר
        titleColor: formData.titleColor ? normalizeHex(formData.titleColor) : null,
        descriptionColor: formData.descriptionColor ? normalizeHex(formData.descriptionColor) : null,
        ctaTextColor: formData.ctaTextColor ? normalizeHex(formData.ctaTextColor) : null,
        ctaBackgroundColor: formData.ctaBackgroundColor ? normalizeHex(formData.ctaBackgroundColor) : null,
        // שמירת שדות גודל פונטים (או null אם לא הוגדרו)
        titleFontSize: formData.titleFontSize || null,
        descriptionFontSize: formData.descriptionFontSize || null,
        ctaFontSize: formData.ctaFontSize || null,
        // שמירת הגדרת ה-overlay (אחוז 0..100) כדי שהיא תתקבל בצד השרת ויוצג ב־carousel
        overlayOpacity: overlayOpacity,
      };

      // מעלה תמונה חדשה אם המשתמש בחר קובץ
      if (imageFile) {
        setIsUploading(true);
        const uploadResult = await onUploadImage(imageFile);
        finalFormData.imageUrl = uploadResult.url;
        finalFormData.imagePublicId = uploadResult.publicId;
        setIsUploading(false);
      }

      await onSave(finalFormData);
    } catch (error) {
      console.error('שגיאה בשמירת באנר:', error);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <div className={styles['banner-form-overlay']} onClick={onCancel} role="presentation">
      <div 
        className={styles['banner-form-container']} 
        onClick={(e) => e.stopPropagation()} 
        dir="rtl"
        role="dialog"
        aria-labelledby="banner-form-title"
        aria-modal="true"
      >
        {/* כותרת החלון */}
        <div className={styles['banner-form-header']}>
          <div className={styles['header-left']}>
            <div>
              <h2 id="banner-form-title">{banner ? 'עריכת באנר' : 'יצירת באנר'}</h2>
              <div className={styles['header-subtitle']}>עיצוב מתקדם עם תצוגה חיה</div>
            </div>
          </div>
          <div className={styles['header-actions']}>
            <button 
              className={styles['btn-icon']} 
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  imageUrl: '',
                  imagePublicId: '',
                  titleColor: undefined,
                  descriptionColor: undefined,
                  ctaTextColor: undefined,
                  ctaBackgroundColor: undefined,
                  ctaText: '',
                  ctaLink: '',
                  order: 0,
                  isActive: true,
                  startDate: undefined,
                  endDate: undefined,
                });
                setImagePreview('');
                setImageFile(null);
                setOverlayOpacity(40);
              }}
              title="אפס טופס"
              type="button"
              aria-label="אפס את כל השדות"
            >
              ↺
            </button>
            <button 
              className={styles['btn-icon']} 
              onClick={onCancel} 
              aria-label="סגור חלון עריכת באנר"
              title="סגור"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* טופס הבאנר */}
        <form onSubmit={handleSubmit} className={styles['banner-form']}>
          
          {/* תפריט Tabs */}
          <div className={styles['tabs']}>
            <button
              type="button"
              className={`${styles['tab-btn']} ${activeTab === 'content' ? styles.active : ''}`}
              onClick={() => setActiveTab('content')}
            >
              📝 תוכן
            </button>
            <button
              type="button"
              className={`${styles['tab-btn']} ${activeTab === 'design' ? styles.active : ''}`}
              onClick={() => setActiveTab('design')}
            >
              🎨 עיצוב
            </button>
            <button
              type="button"
              className={`${styles['tab-btn']} ${activeTab === 'cta' ? styles.active : ''}`}
              onClick={() => setActiveTab('cta')}
            >
              🎯 CTA
            </button>
            <button
              type="button"
              className={`${styles['tab-btn']} ${activeTab === 'timing' ? styles.active : ''}`}
              onClick={() => setActiveTab('timing')}
            >
              📅 תזמון
            </button>
          </div>

          {/* Tab: תוכן */}
          <div className={`${styles['tab-content']} ${activeTab === 'content' ? styles.active : ''}`}>
          
          {/* שדה כותרת + בחירת צבע + גודל פונט */}
          <div className={styles['form-row']}>
            <div className={styles['form-group']} style={{ flex: 1 }}>
              <label htmlFor="title">כותרת (אופציונלי)</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="הזינו כותרת שתופיע על גבי הבאנר"
              />
            </div>
            <div className={styles['form-group']} style={{ width: '200px', marginRight: '12px' }}>
              {/* <label htmlFor="titleColor">צבע כותרת</label> */}
              <ColorSelect
                value={formData.titleColor || ''}
                onChange={(hex) => setFormData((prev) => ({ ...prev, titleColor: hex }))}
                presets={colorPresets}
                showCustomPicker={true}
                showConfirmButtons={true}
                allowCustomHex={true}
                label="צבע כותרת"
                placeholder="בחר צבע"
              />
              <div className={styles['color-contrast']} role="status" aria-live="polite" style={{ fontSize: '11px', marginTop: '4px' }}>
                <small>{getContrastStatus(formData.titleColor).label}</small>
              </div>
            </div>
            <div className={styles['form-group']} style={{ width: '140px', marginRight: '12px' }}>
              <label htmlFor="titleFontSize">גודל פונט</label>
              <select
                id="titleFontSize"
                value={formData.titleFontSize || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, titleFontSize: e.target.value || null }))}
                className={styles['font-size-select']}
              >
                <option value="">ברירת מחדל</option>
                <option value="xs">קטן מאוד (xs)</option>
                <option value="sm">קטן (sm)</option>
                <option value="base">רגיל (base)</option>
                <option value="lg">גדול (lg)</option>
                <option value="xl">גדול מאוד (xl)</option>
                <option value="2xl">ענק (2xl)</option>
                <option value="3xl">ענק מאוד (3xl)</option>
              </select>
            </div>
          </div>

          {/* שדה תיאור + בחירת צבע + גודל פונט */}
          <div className={styles['form-row']}>
            <div className={styles['form-group']} style={{ flex: 1 }}>
              <label htmlFor="description">תיאור (אופציונלי)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="הוסיפו טקסט משלים שיופיע בבאנר"
                rows={3}
              />
            </div>
            <div className={styles['form-group']} style={{ width: '200px', marginRight: '12px' }}>
              {/* <label htmlFor="descriptionColor">צבע תיאור</label> */}
              <ColorSelect
                value={formData.descriptionColor || ''}
                onChange={(hex) => setFormData((prev) => ({ ...prev, descriptionColor: hex }))}
                presets={colorPresets}
                showCustomPicker={true}
                showConfirmButtons={true}
                allowCustomHex={true}
                label="צבע תיאור"
                placeholder="בחר צבע"
              />
              <div className={styles['color-contrast']} role="status" aria-live="polite" style={{ fontSize: '11px', marginTop: '4px' }}>
                <small>{getContrastStatus(formData.descriptionColor).label}</small>
              </div>
            </div>
            <div className={styles['form-group']} style={{ width: '140px', marginRight: '12px' }}>
              <label htmlFor="descriptionFontSize">גודל פונט</label>
              <select
                id="descriptionFontSize"
                value={formData.descriptionFontSize || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, descriptionFontSize: e.target.value || null }))}
                className={styles['font-size-select']}
              >
                <option value="">ברירת מחדל</option>
                <option value="xs">קטן מאוד (xs)</option>
                <option value="sm">קטן (sm)</option>
                <option value="base">רגיל (base)</option>
                <option value="lg">גדול (lg)</option>
                <option value="xl">גדול מאוד (xl)</option>
                <option value="2xl">ענק (2xl)</option>
                <option value="3xl">ענק מאוד (3xl)</option>
              </select>
            </div>
          </div>

          {/* העלאת תמונה */}
          <div className={styles['form-group']}>
            <label>
              תמונה <span className={styles.required}>*</span>
            </label>
            <div className={styles['image-upload-container']}>
              {imagePreview ? (
                <div className={styles['image-preview']}>
                  <img src={imagePreview} alt="תצוגה מקדימה של הבאנר" />
                  <button
                    type="button"
                    className={styles['remove-image-btn']}
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setFormData((prev) => ({
                        ...prev,
                        imageUrl: '',
                        imagePublicId: '',
                      }));
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <label className={styles['image-upload-label']}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className={styles['image-upload-input']}
                  />
                  <Upload size={32} />
                  <span>לחצו כדי להעלות תמונה</span>
                  <span className={styles['upload-hint']}>קבצי PNG או JPG עד 5MB</span>
                </label>
              )}
            </div>
            {errors.image && <span className={styles['error-message']}>{errors.image}</span>}
          </div>
          
          </div>

          {/* Tab: עיצוב */}
          <div className={`${styles['tab-content']} ${activeTab === 'design' ? styles.active : ''}`}>
          
          {/* Overlay Opacity Slider */}
          <div className={styles['form-group']}>
            <label htmlFor="overlayOpacity">אטימות שכבת הצל (Overlay)</label>
            <div className={styles['slider-wrapper']}>
              <input
                type="range"
                id="overlayOpacity"
                className={styles['slider']}
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                aria-label="שליטה באטימות overlay"
              />
              <span className={styles['slider-value']}>{overlayOpacity}%</span>
            </div>
          </div>
          
          </div>

          {/* Tab: CTA */}
          <div className={`${styles['tab-content']} ${activeTab === 'cta' ? styles.active : ''}`}>
          
          {/* טקסט לקריאה לפעולה + צבע טקסט + גודל פונט */}
          <div className={styles['form-row']}>
            <div className={styles['form-group']} style={{ flex: 1 }}>
              <label htmlFor="ctaText">טקסט קריאה לפעולה</label>
              <input
                type="text"
                id="ctaText"
                name="ctaText"
                value={formData.ctaText}
                onChange={handleInputChange}
                className={errors.ctaText ? 'error' : ''}
                placeholder="לדוגמה: קנו עכשיו, גילוי הפרטים"
              />
              {errors.ctaText && <span className={styles['error-message']}>{errors.ctaText}</span>}
            </div>
            <div className={styles['form-group']} style={{ width: '200px', marginRight: '12px' }}>
              {/* <label htmlFor="ctaTextColor">צבע טקסט</label> */}
              <ColorSelect
                value={formData.ctaTextColor || ''}
                onChange={(hex) => setFormData((prev) => ({ ...prev, ctaTextColor: hex }))}
                presets={colorPresets}
                showCustomPicker={true}
                showConfirmButtons={true}
                allowCustomHex={true}
                label="צבע טקסט CTA"
                placeholder="בחר צבע"
              />
              <div className={styles['color-contrast']} role="status" aria-live="polite" style={{ fontSize: '11px', marginTop: '4px' }}>
                <small>{getContrastStatus(formData.ctaTextColor).label}</small>
              </div>
            </div>
            <div className={styles['form-group']} style={{ width: '140px', marginRight: '12px' }}>
              <label htmlFor="ctaFontSize">גודל פונט</label>
              <select
                id="ctaFontSize"
                value={formData.ctaFontSize || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ctaFontSize: e.target.value || null }))}
                className={styles['font-size-select']}
              >
                <option value="">ברירת מחדל</option>
                <option value="xs">קטן מאוד (xs)</option>
                <option value="sm">קטן (sm)</option>
                <option value="base">רגיל (base)</option>
                <option value="lg">גדול (lg)</option>
                <option value="xl">גדול מאוד (xl)</option>
                <option value="2xl">ענק (2xl)</option>
                <option value="3xl">ענק מאוד (3xl)</option>
              </select>
            </div>
          </div>

          {/* קישור לקריאה לפעולה + צבע רקע */}
          <div className={styles['form-row']}>
            <div className={styles['form-group']} style={{ flex: 1 }}>
              <label htmlFor="ctaLink">קישור קריאה לפעולה</label>
              <input
                type="text"
                id="ctaLink"
                name="ctaLink"
                value={formData.ctaLink}
                onChange={handleInputChange}
                placeholder="לדוגמה: /products או https://example.com"
              />
            </div>
            <div className={styles['form-group']} style={{ width: '200px', marginRight: '12px' }}>
              {/* <label htmlFor="ctaBackgroundColor">צבע רקע</label> */}
              <ColorSelect
                value={formData.ctaBackgroundColor || ''}
                onChange={(hex) => setFormData((prev) => ({ ...prev, ctaBackgroundColor: hex }))}
                presets={colorPresets}
                showCustomPicker={true}
                showConfirmButtons={true}
                allowCustomHex={true}
                label="צבע רקע CTA"
                placeholder="בחר צבע"
              />
              <div className={styles['color-contrast']} role="status" aria-live="polite" style={{ fontSize: '11px', marginTop: '4px' }}>
                <small>{getContrastStatus(formData.ctaBackgroundColor).label}</small>
              </div>
            </div>
          </div>
          
          <div className={styles['divider']}></div>
          
          {/* כפתור הצעת צבע אופטימלי */}
          <div className={styles['form-group']}>
            <button
              type="button"
              className={`${styles['btn']} ${styles['btn-secondary']}`}
              onClick={handleSuggestContrast}
              aria-label="הצע צבע טקסט אופטימלי עבור ה-CTA בהתבסס על צבע הרקע"
            >
              💡 הצע צבע טקסט אופטימלי
            </button>
            <p className={styles['help-text']}>
              הכפתור מנתח את צבע הרקע של ה-CTA ומציע צבע טקסט אופטימלי (שחור/לבן) לפי תקני WCAG
            </p>
          </div>
          
          </div>

          {/* Tab: תזמון */}
          <div className={`${styles['tab-content']} ${activeTab === 'timing' ? styles.active : ''}`}>
          
          {/* טווח תאריכים */}
          <div className={styles['form-row']}>
            <div className={styles['form-group']}>
              <label htmlFor="startDate">
                <Calendar size={16} />
                תאריך התחלה
              </label>
              <input
                type="datetime-local"
                id="startDate"
                name="startDate"
                value={isoToLocalDatetimeValue(formData.startDate)}
                onChange={handleInputChange}
              />
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="endDate">
                <Calendar size={16} />
                תאריך סיום
              </label>
              <input
                type="datetime-local"
                id="endDate"
                name="endDate"
                value={isoToLocalDatetimeValue(formData.endDate)}
                onChange={handleInputChange}
                className={errors.endDate ? styles.error : ''}
              />
              {errors.endDate && (
                <span className={styles['error-message']}>{errors.endDate}</span>
              )}
            </div>
          </div>

          {/* תווית דינמית שמתארת את התזמון */}
          <div className="status status--info" style={{ marginTop: '12px' }}>
            {getDisplayLogic(formData.startDate, formData.endDate)}
          </div>
          
          <div className={styles['divider']}></div>

          {/* סטטוס פעילות */}
          <div className={`${styles['form-group']} ${styles['checkbox-group']}`}>
            <label>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
              <span>הצג באנר</span>
            </label>
            <p className={styles['help-text']}>
              רק באנרים פעילים יוצגו בקרוסלת הבית
            </p>
          </div>
          
          {/* סדר תצוגה */}
          <div className={styles['form-group']}>
            <label htmlFor="order">סדר תצוגה</label>
            <input
              type="number"
              id="order"
              name="order"
              value={formData.order}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          
          </div>

          {/* אזהרה כשהבאנר כבוי - מחוץ ל-tabs */}
          {!formData.isActive && (
            <div className="status status--warning" style={{ marginTop: '16px' }}>
              ⚠️ הבאנר מוגדר כלא פעיל - לא יוצג בקרוסלה
            </div>
          )}

          {/* Preview חי קטן בתוך הטופס - מחוץ ל-tabs */}
          <div className={styles['form-group']}>
            <label>👁️ תצוגה מקדימה חיה</label>
            <div
              className={styles['banner-preview']}
              style={{
                // הגדרת CSS variables עבור preview כך שידמה את ה-carousel
                '--banner-title-color': formData.titleColor || 'var(--color-heading-inverse)',
                '--banner-description-color': formData.descriptionColor || 'var(--color-text-inverse)',
                '--banner-cta-text-color': formData.ctaTextColor || 'var(--color-text-inverse)',
                '--banner-cta-background-color': formData.ctaBackgroundColor || 'var(--color-accent)',
                // גדלי פונט מותאמים לבאנר עם מנעד גדול ל-xl/2xl/3xl
                '--banner-title-size': formData.titleFontSize 
                  ? (formData.titleFontSize === 'xl' ? '3rem' 
                    : formData.titleFontSize === '2xl' ? '4rem' 
                    : formData.titleFontSize === '3xl' ? '5.5rem'
                    : `var(--font-size-${formData.titleFontSize})`)
                  : '2.5rem',
                '--banner-description-size': formData.descriptionFontSize 
                  ? (formData.descriptionFontSize === 'xl' ? '1.5rem' 
                    : formData.descriptionFontSize === '2xl' ? '2rem' 
                    : formData.descriptionFontSize === '3xl' ? '3rem'
                    : `var(--font-size-${formData.descriptionFontSize})`)
                  : '1.125rem',
                '--banner-cta-size': formData.ctaFontSize 
                  ? (formData.ctaFontSize === 'xl' ? '1.25rem' 
                    : formData.ctaFontSize === '2xl' ? '1.5rem' 
                    : formData.ctaFontSize === '3xl' ? '2rem'
                    : `var(--font-size-${formData.ctaFontSize})`)
                  : '1rem',
                '--overlay-opacity': overlayOpacity / 100,
                backgroundImage: imagePreview ? `url(${imagePreview})` : undefined,
              } as React.CSSProperties}
              aria-hidden="true"
            >
              <div className={styles['banner-preview-content']}>
                <h3 className={styles['preview-title']}>{formData.title || 'כותרת לדוגמה'}</h3>
                {formData.description && <p className={styles['preview-desc']}>{formData.description}</p>}
                {formData.ctaText && <button className={styles['preview-cta']}>{formData.ctaText}</button>}
              </div>
            </div>
          </div>

          {/* פעולות שמירה */}
          <div className={styles['form-actions']}>
            <Button type="button" variant="outline" onClick={onCancel}>
              בטל
            </Button>
            <Button type="submit" disabled={isSaving || isUploading}>
              {isUploading ? 'מעלה...' : isSaving ? 'שומר...' : 'שמור באנר'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerForm;
