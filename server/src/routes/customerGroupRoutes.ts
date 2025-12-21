import { Router } from 'express';
import {
  getCustomerGroups,
  getCustomerGroup,
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
  forceDeleteCustomerGroup, // חדש: למחיקה בכוח עם משתמשים
  toggleCustomerGroup,
  assignUserToGroup
} from '../controllers/customerGroupController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

// יצירת router
const router = Router();

// רוטס ציבורי - קריאה בלבד
router.get('/', getCustomerGroups);
router.get('/:id', getCustomerGroup);

// רוטס מוגן - דורש אימות מנהל (authMiddleware + requireAdmin)
router.post('/', authMiddleware, requireAdmin, createCustomerGroup);
router.put('/:id', authMiddleware, requireAdmin, updateCustomerGroup);
router.put('/assign-user/:userId', authMiddleware, requireAdmin, assignUserToGroup);
router.delete('/:id', authMiddleware, requireAdmin, deleteCustomerGroup); // בדיקה רגילה - חוסם אם יש משתמשים
router.delete('/:id/force', authMiddleware, requireAdmin, forceDeleteCustomerGroup); // מחיקה בכוח - מוחק גם עם משתמשים
router.patch('/:id/toggle', authMiddleware, requireAdmin, toggleCustomerGroup);

// ייצוא ה-router
export default router;
