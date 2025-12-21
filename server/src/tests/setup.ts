/**
 * הגדרת סביבה לבדיקות
 * נטען לפני כל בדיקה
 */

import dotenv from 'dotenv';
import path from 'path';

// טעינת משתני סביבה מקובץ .env.test אם קיים, אחרת מ-.env
const envFile = path.resolve(__dirname, '../../.env.test');
const defaultEnvFile = path.resolve(__dirname, '../../.env');

// נסה לטעון .env.test, אם לא קיים - טען .env רגיל
dotenv.config({ path: envFile });
dotenv.config({ path: defaultEnvFile });

// הגדרת משתני סביבה לבדיקות
process.env.NODE_ENV = 'test';

// Timeout גלובלי
jest.setTimeout(30000);

// השתקת console.log בבדיקות (אופציונלי)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

console.log('🧪 סביבת בדיקות נטענה');
