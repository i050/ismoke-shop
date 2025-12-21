/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/**
 * קובץ הגדרות Playwright לבדיקות E2E
 * מוגדר לעבוד עם dev servers מקומיים (client:5173, server:5000)
 */
export default defineConfig({
  // תיקיית הבדיקות
  testDir: './e2e',
  
  // timeout לכל בדיקה - 30 שניות
  timeout: 30 * 1000,
  
  // הגדרות expect
  expect: {
    timeout: 5000
  },
  
  // ריצה במקביל - רק בדיקה אחת בו-זמנית (למניעת קונפליקטים ב-DB)
  fullyParallel: false,
  workers: 1,
  
  // נסה שוב במקרה של כשלון (flaky tests)
  retries: process.env.CI ? 2 : 0,
  
  // דיווח מפורט
  reporter: [
    ['html'],
    ['list']
  ],
  
  // הגדרות משותפות לכל הבדיקות
  use: {
    // Base URL של האפליקציה
    baseURL: 'http://localhost:5173',
    
    // צילומי מסך רק בכשלון
    screenshot: 'only-on-failure',
    
    // סרטון רק בכשלון
    video: 'retain-on-failure',
    
    // trace רק בכשלון
    trace: 'on-first-retry',
    
    // הגדרות viewport ברירת מחדל
    viewport: { width: 1280, height: 720 },
    
    // ignore HTTPS errors בפיתוח
    ignoreHTTPSErrors: true,
  },

  // הגדרות פרויקטים (דפדפנים שונים)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // בדיקות מובייל
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // הפעלת dev server לפני הבדיקות (אופציונלי - אם לא רץ ידנית)
  // webServer: {
  //   command: 'npm run dev',
  //   port: 5173,
  //   timeout: 120 * 1000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
