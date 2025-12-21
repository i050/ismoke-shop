import { Request, Response } from 'express';
import crypto from 'crypto';
import { Product } from '../models/Product';
import { Sku } from '../models/Sku';
import { IImage } from '../models/Product';

/**
 * אימות חתימת Webhook מCloudinary
 * מוודא שהבקשה באמת הגיעה מCloudinary ולא מגורם זדוני
 */
const verifyWebhookSignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
};

/**
 * טיפול ב-Webhook מCloudinary
 * מקבל התראות על אירועים שקורים ישירות ב-Cloudinary Console
 */
export const handleCloudinaryWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    // אימות חתימה
    const signature = req.headers['x-cld-signature'] as string;
    const secret = process.env.CLOUDINARY_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('❌ CLOUDINARY_WEBHOOK_SECRET is not defined');
      return res.status(500).json({ success: false, error: 'Server misconfiguration' });
    }
    
    const body = JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(body, signature, secret)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    
    // קריאת פרטי האירוע
    const { notification_type, public_id } = req.body;
    
    console.log(`📢 Cloudinary Webhook: ${notification_type} - ${public_id}`);
    
    // טיפול לפי סוג האירוע
    switch (notification_type) {
      case 'delete':
      case 'destroy':
        await handleImageDeleted(public_id);
        break;
      
      case 'upload':
        await handleImageUploaded(public_id, req.body);
        break;
      
      default:
        console.log(`ℹ️ Unhandled notification type: ${notification_type}`);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ success: false });
  }
};

/**
 * טיפול במחיקת תמונה שלא דרך ה-API שלנו
 * מסמן את התמונה כמחוקה במונגו ושולח התראה למנהל
 */
const handleImageDeleted = async (publicId: string) => {
  console.log(`🗑️ Image deleted externally: ${publicId}`);
  
  // חיפוש ב-Products
  const product = await Product.findOne({
    'images.public_id': publicId,
  });
  
  if (product) {
    const imageIndex = product.images.findIndex(
      (img: IImage) => img.public_id === publicId
    );
    
    if (imageIndex !== -1) {
      product.images[imageIndex].isDeleted = true;
      product.images[imageIndex].deletedAt = new Date();
      await product.save();
      
      console.log(`✅ Product image marked as deleted in MongoDB`);
      
      await sendAdminAlert(
        'תמונה נמחקה מחוץ למערכת',
        `תמונה של מוצר "${product.name}" נמחקה ישירות מCloudinary.\nPublic ID: ${publicId}`
      );
    }
    
    return;
  }
  
  // חיפוש ב-SKUs
  const sku = await Sku.findOne({
    'images.public_id': publicId,
  });
  
  if (sku && sku.images) {
    const imageIndex = sku.images.findIndex(
      (img: IImage) => img.public_id === publicId
    );
    
    if (imageIndex !== -1) {
      sku.images[imageIndex].isDeleted = true;
      sku.images[imageIndex].deletedAt = new Date();
      await sku.save();
      
      console.log(`✅ SKU image marked as deleted in MongoDB`);
      
      await sendAdminAlert(
        'תמונה נמחקה מחוץ למערכת',
        `תמונה של SKU "${sku.sku}" נמחקה ישירות מCloudinary.\nPublic ID: ${publicId}`
      );
    }
  }
};

/**
 * טיפול בהעלאת תמונה שלא דרך ה-API שלנו
 * שולח התראה למנהל על העלאה חיצונית
 */
const handleImageUploaded = async (publicId: string, data: any) => {
  console.log(`📤 Image uploaded externally: ${publicId}`);
  
  await sendAdminAlert(
    'תמונה הועלתה מחוץ למערכת',
    `תמונה חדשה הועלתה ישירות לCloudinary: ${publicId}\nURL: ${data.secure_url}`
  );
};

/**
 * שליחת התראה למנהל
 * כרגע רק מדפיס ללוג, בעתיד ניתן להוסיף Email/Slack/Discord
 */
const sendAdminAlert = async (subject: string, message: string) => {
  // כאן תוסיף אינטגרציה עם Slack/Email/Discord
  console.log(`🚨 ALERT: ${subject}`);
  console.log(message);
  
  // דוגמה לשליחת Email (לא מיושם):
  // await sendEmail({
  //   to: 'admin@yourstore.com',
  //   subject,
  //   text: message,
  // });
};
