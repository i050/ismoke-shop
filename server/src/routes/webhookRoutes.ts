import { Router } from 'express';
import { handleCloudinaryWebhook } from '../controllers/webhookController';

const router = Router();

/**
 * Webhook מCloudinary (ללא auth - Cloudinary שולח ישירות)
 * האימות נעשה על ידי בדיקת חתימה דיגיטלית בתוך ה-controller
 */
router.post('/cloudinary', handleCloudinaryWebhook);

export default router;
