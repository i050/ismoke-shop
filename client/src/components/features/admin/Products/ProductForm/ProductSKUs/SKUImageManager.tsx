// SKU Image Manager Component
// מטרת הקומפוננטה: wrapper דק מעל ImageGalleryManager במצב modal
// משתמש בקומפוננטה המשותפת עם הגדרות ספציפיות ל-SKU

import React from 'react';
import ImageGalleryManager from '../../../../../ui/ImageGalleryManager';
import type { IImage } from '../../../../../../types/Product';

/**
 * Props Interface של SKUImageManager
 */
interface SKUImageManagerProps {
  // בקרת Modal
  isOpen: boolean;
  onClose: () => void;
  
  // נתוני SKU
  skuName: string;              // שם הוריאנט (לכותרת)
  sku: string;                  // קוד SKU להעלאה ל-Cloudinary
  images: IImage[];             // תמונות קיימות
  
  // פעולות
  onSave: (images: IImage[]) => void | Promise<void>;
  onUpload?: (files: File[], sku: string) => Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>>;
  
  // הגדרות
  maxImages?: number;           // ברירת מחדל: 10
  maxFileSize?: number;         // ברירת מחדל: 5MB
}

/**
 * קומפוננטת SKUImageManager
 * wrapper דק - משתמש ב-ImageGalleryManager במצב modal
 * עם Soft Delete וללא reorder
 */
const SKUImageManager: React.FC<SKUImageManagerProps> = ({
  isOpen,
  onClose,
  skuName,
  sku,
  images,
  onSave,
  onUpload,
  maxImages = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
}) => {
  return (
    <ImageGalleryManager
      mode="modal"
      isOpen={isOpen}
      onClose={onClose}
      title={` ניהול תמונות - ${skuName}`}
      images={images}
      onChange={(updatedImages) => {
        // במצב modal עם soft delete, onChange נקרא רק בזמן שמירה סופית
        // נעביר את התמונות המעודכנות ל-onSave
        onSave(updatedImages);
      }}
      onUpload={onUpload ? (files) => onUpload(files, sku) : undefined}
      maxImages={maxImages}
      maxFileSize={maxFileSize}
      deleteMode="soft"
      allowReorder={false}
      showPrimaryBadge={false}
      showProgress={true}
    />
  );
};

export default SKUImageManager;
