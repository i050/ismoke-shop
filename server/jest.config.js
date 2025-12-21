/**
 * הגדרות Jest לבדיקות בצד השרת
 * תומך ב-TypeScript עם ts-jest
 */

module.exports = {
  // שימוש ב-ts-jest לתמיכה ב-TypeScript
  preset: 'ts-jest',
  
  // סביבת הרצה - Node.js
  testEnvironment: 'node',
  
  // תיקיית השורש לבדיקות
  roots: ['<rootDir>/src'],
  
  // תבנית למציאת קבצי בדיקות
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // קבצים להתעלם מהם
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // הגדרות ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // סיומות קבצים לזיהוי
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  
  // משתני סביבה לבדיקות
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  
  // Timeout לבדיקות (30 שניות - כי יש חיבור ל-DB)
  testTimeout: 30000,
  
  // הצגת פירוט מלא
  verbose: true,
  
  // איסוף כיסוי קוד
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/server.ts'
  ],
  
  // סף מינימלי לכיסוי קוד (אופציונלי)
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70
  //   }
  // },
  
  // ניקוי mocks בין בדיקות
  clearMocks: true,
  
  // הפעלה מקבילית
  maxWorkers: 1, // הרצה סדרתית כי יש DB
};
