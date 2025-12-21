// Routes לניהול משתמשים - משימה 2: שיוך לקוחות לקבוצות
// הרחבה: יצירת משתמש חדש ע"י מנהל, אישור הרשמות, עריכת משתמשים, צפייה בסל והזמנות
import express from 'express';
import { 
  getAllUsers,
  getUserGroup,
  assignUserToGroup,
  removeUserFromGroup,
  getGroupMembers,
  bulkAssignUsers,
  bulkRemoveUsers,
  createUser,
  getPendingApprovalUsers,
  approveUser,
  rejectUser,
  updateUser,
  getUserById,
  getUserCart,
  getUserOrders,
  getUserOrderById,
  getUserStatistics
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = express.Router();

// הגנת כל ה-routes - רק מנהלים יכולים לגשת לניהול משתמשים
router.use(authMiddleware);
router.use(requireAdmin);

// POST /api/users - יצירת משתמש חדש ע"י מנהל
router.post('/', createUser);

// GET /api/users/statistics - קבלת סטטיסטיקות משתמשים
router.get('/statistics', getUserStatistics);

// GET /api/users/pending-approval - קבלת משתמשים ממתינים לאישור
router.get('/pending-approval', getPendingApprovalUsers);

// PATCH /api/users/:userId/approve - אישור משתמש
router.patch('/:userId/approve', approveUser);

// DELETE /api/users/:userId/reject - דחיית משתמש
router.delete('/:userId/reject', rejectUser);

// GET /api/users - קבלת כל המשתמשים עם פילטרים
router.get('/', getAllUsers);

// GET /api/users/:userId - קבלת פרטי משתמש בודד
router.get('/:userId', getUserById);

// PUT /api/users/:userId - עדכון פרטי משתמש ע"י מנהל
router.put('/:userId', updateUser);

// GET /api/users/:userId/cart - קבלת סל הקניות של משתמש
router.get('/:userId/cart', getUserCart);

// GET /api/users/:userId/orders - קבלת היסטוריית הזמנות של משתמש
router.get('/:userId/orders', getUserOrders);

// GET /api/users/:userId/orders/:orderId - קבלת פרטי הזמנה ספציפית
router.get('/:userId/orders/:orderId', getUserOrderById);

// GET /api/users/:userId/group - קבלת קבוצה של משתמש ספציפי
router.get('/:userId/group', getUserGroup);

// POST /api/users/:userId/assign - שיוך משתמש לקבוצה
router.post('/:userId/assign', assignUserToGroup);

// DELETE /api/users/:userId/group - הסרת משתמש מקבוצה
router.delete('/:userId/group', removeUserFromGroup);

// GET /api/users/groups/:groupId/members - קבלת חברי קבוצה
router.get('/groups/:groupId/members', getGroupMembers);

// POST /api/users/bulk-assign - שיוך מרובה
router.post('/bulk-assign', bulkAssignUsers);

// POST /api/users/bulk-remove - הסרה מרובה
router.post('/bulk-remove', bulkRemoveUsers);

export default router;
