// קובץ עזר לפיתוח: טוען נתוני משתמשים מדומים ל-Redux store לצורך בדיקות
import { store } from '../store';

// Mock users — דוגמא מהירה לבדיקה
const mockUsers = Array.from({ length: 5 }).map((_, i) => ({
  _id: `user-${i + 1}`,
  email: `user${i + 1}@example.com`,
  firstName: `שם${i + 1}`,
  lastName: `משפחה${i + 1}`,
  isActive: true,
  createdAt: new Date().toISOString(),
}));

const mockPayload = {
  users: mockUsers,
  pagination: {
    page: 1,
    limit: 20,
    total: mockUsers.length,
    totalPages: 1,
  },
  filters: { search: '', hasGroup: undefined, isActive: undefined }
};

// Dispatch של action מלא (fulfilled) לצורך מילוי מהיר של ה-state לפיתוח
store.dispatch({ type: 'userManagement/fetchUsers/fulfilled', payload: mockPayload });

console.debug('Dev helper: mock users loaded into store');
