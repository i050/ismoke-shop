import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  // להחריג תיקיות/קבצים שנרצה להתעלם מהם ב-lint (הוספת src/pages/*.tsx כדי להתעלם מקבצי root-level ישנים)
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
  // החזרת הכלל למצב 'error' — אנו דורשים תיקון שימושים ב-any לשמירה על בטיחות טיפוסים
  '@typescript-eslint/no-explicit-any': 'error',
    },
  },
])
