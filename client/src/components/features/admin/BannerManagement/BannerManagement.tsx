import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import {
  fetchBanners,
  createBanner as createBannerAction,
  updateBanner as updateBannerAction,
  deleteBanner as deleteBannerAction,
  reorderBanners as reorderBannersAction,
  uploadBannerImage,
  setMode,
  setEditingBanner,
  clearError,
} from '../../../../store/slices/bannerManagementSlice';
import type { Banner, BannerFormData } from '@/services/bannerService';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, GripVertical, Eye, MousePointer } from 'lucide-react';
import BannerForm from './BannerForm/BannerForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '../../../../hooks/useToast';
import './BannerManagement.css';

const BannerManagement: React.FC = () => {
  // מצב הגלובלי של הבאנרים דרך Redux
  const dispatch = useAppDispatch();
  const { banners, loading, error, mode, editingBanner: reduxEditingBanner } = useAppSelector(
    (state) => state.bannerManagement
  );

  // ניהול מצבים מקומיים עבור מחיקה וגרירת פריטים
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const { showToast } = useToast();

  // טעינת רשימת הבאנרים עם כניסה למסך
  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  const handleCreate = () => {
    dispatch(setEditingBanner(null));
    dispatch(setMode('create'));
  };

  const handleEdit = (banner: Banner) => {
    dispatch(setEditingBanner(banner));
  };

  const handleDelete = (banner: Banner) => {
    setDeleteTarget(banner);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await dispatch(deleteBannerAction(deleteTarget._id)).unwrap();
      showToast('success', 'הבאנר נמחק בהצלחה');
    } catch (err: any) {
      console.error('שגיאה במחיקת באנר:', err);
      showToast('error', err.message || 'נכשלנו במחיקת הבאנר');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSave = async (formData: BannerFormData) => {
    try {
      if (reduxEditingBanner) {
        await dispatch(
          updateBannerAction({
            id: reduxEditingBanner._id,
            data: formData,
            version: reduxEditingBanner.version || 0,
          })
        ).unwrap();
        showToast('success', 'הבאנר עודכן בהצלחה');
      } else {
        await dispatch(createBannerAction(formData)).unwrap();
        showToast('success', 'הבאנר נוצר בהצלחה');
      }
      dispatch(setMode('list'));
    } catch (err: any) {
      console.error('שגיאה בשמירת באנר:', err);
      showToast('error', err.message || 'נכשלנו בשמירת הבאנר');
    }
  };

  const handleImageUpload = async (file: File): Promise<{ url: string; publicId: string }> => {
    try {
      const result = await dispatch(uploadBannerImage(file)).unwrap();
      return result;
    } catch (err: any) {
      console.error('שגיאה בהעלאת תמונה:', err);
      showToast('error', err.message || 'נכשלנו בהעלאת התמונה');
      throw err;
    }
  };

  // מאזיני גרירה כדי לאפשר שינוי סדר הבאנרים
  const handleDragStart = (index: number) => {
    setDragSourceIndex(index);
    setDragTargetIndex(index);
  };

  const handleDragOver = (_e: React.DragEvent, index: number) => {
    _e.preventDefault();
    if (dragTargetIndex === index) {
      return;
    }

    // שומר את המיקום שאליו המקטע הנגרר אמור לרדת
    setDragTargetIndex(index);
  };

  const handleDragEnd = async () => {
    if (
      dragSourceIndex === null ||
      dragTargetIndex === null ||
      dragSourceIndex === dragTargetIndex
    ) {
      setDragSourceIndex(null);
      setDragTargetIndex(null);
      return;
    }

    // יוצר עותק של המערך וממקם מחדש את הבאנר הנגרר לפני שליחת הבקשה
    const reordered = [...banners];
    const [movedBanner] = reordered.splice(dragSourceIndex, 1);

    if (!movedBanner) {
      setDragSourceIndex(null);
      setDragTargetIndex(null);
      return;
    }

    reordered.splice(dragTargetIndex, 0, movedBanner);

    try {
      const newOrder = reordered.map((banner) => banner._id);
      await dispatch(reorderBannersAction(newOrder)).unwrap();
      showToast('success', 'סדר הבאנרים עודכן בהצלחה');
    } catch (err: any) {
      console.error('שגיאה בעדכון סדר הבאנרים:', err);
      showToast('error', err.message || 'נכשלנו בעדכון הסדר');
      // טעינה מחדש מהשרת
      dispatch(fetchBanners());
    } finally {
      setDragSourceIndex(null);
      setDragTargetIndex(null);
    }
  };

  // מצב טעינה ראשוני עבור רשימת הבאנרים
  if (loading && banners.length === 0) {
    return (
      <div className="banner-management" dir="rtl">
        <div className="banner-loading">
          <div className="spinner"></div>
          <p>טוען באנרים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="banner-management" dir="rtl">
      {/* כותרת הדף */}
      <div className="banner-header">
        <div>
          <h1>ניהול באנרים</h1>
          <p className="text-muted">שליטה מלאה על הבאנרים של קרוסלת הבית</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={18} />
          הוסף באנר
        </Button>
      </div>

      {/* הודעת שגיאה */}
      {error && (
        <div className="banner-error" role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              dispatch(clearError());
              dispatch(fetchBanners());
            }}
          >
            נסה שוב
          </Button>
        </div>
      )}

      {/* רשימת הבאנרים */}
      {banners.length === 0 ? (
        <div className="banner-empty">
          <p>לא נמצאו באנרים. התחילו בלהוסיף את הבאנר הראשון שלכם.</p>
          <Button onClick={handleCreate}>
            <Plus size={18} />
            צור באנר חדש
          </Button>
        </div>
      ) : (
        <div className="banner-list">
          {banners.map((banner, index) => (
            <div
              key={banner._id}
              className={`banner-item ${!banner.isActive ? 'inactive' : ''} ${
                dragTargetIndex === index ? 'dragging' : ''
              }`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* ידית גרירה לשינוי סדר */}
              <div className="banner-drag-handle">
                <GripVertical size={20} />
              </div>

              {/* תצוגה מקדימה של הבאנר */}
              <div className="banner-preview">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title || 'באנר ללא כותרת'} />
                ) : (
                  <div className="banner-no-image">אין תמונה</div>
                )}
              </div>

              {/* מידע על הבאנר */}
              <div className="banner-info">
                <h3>{banner.title}</h3>
                <p className="banner-description">{banner.description}</p>
                
                <div className="banner-meta">
                  <span className={`banner-status ${banner.isActive ? 'active' : 'inactive'}`}>
                    {banner.isActive ? 'פעיל' : 'לא פעיל'}
                  </span>
                  {banner.ctaLink && (
                    <span className="banner-cta-badge">כולל כפתור פעולה</span>
                  )}
                </div>
              </div>

              {/* נתוני ביצועים של הבאנר */}
              <div className="banner-stats">
                <div className="stat">
                  <Eye size={16} />
                  <span>{banner.impressionCount || 0}</span>
                  <span className="stat-label">צפיות</span>
                </div>
                <div className="stat">
                  <MousePointer size={16} />
                  <span>{banner.clickCount || 0}</span>
                  <span className="stat-label">קליקים</span>
                </div>
              </div>

              {/* פעולות זמינות על כל באנר */}
              <div className="banner-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(banner)}
                  aria-label="עריכת באנר"
                >
                  <Edit size={16} />
                  עריכה
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(banner)}
                  aria-label="מחיקת באנר"
                >
                  <Trash2 size={16} />
                  מחיקה
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* חלון הטופס ליצירה או עריכה */}
      {(mode === 'create' || mode === 'edit') && (
        <BannerForm
          banner={reduxEditingBanner}
          onSave={handleSave}
          onCancel={() => dispatch(setMode('list'))}
          onUploadImage={handleImageUpload}
        />
      )}

      {/* דיאלוג אישור לפני מחיקה */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title="מחיקת באנר"
          message={`אתם בטוחים שברצונכם למחוק את "${deleteTarget.title || 'באנר ללא כותרת'}"? לא ניתן לבטל פעולה זו.`}
          confirmText="מחק"
          cancelText="בטל"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default BannerManagement;
