// router.tsx - הגדרת Data Router המרכזי של האפליקציה
// מבנה זה מאפשר שימוש ב-ScrollRestoration ויכולות מתקדמות של React Router 6.4+
/* eslint-disable react-refresh/only-export-components */

import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import RootLayout from '../RootLayout.tsx';
import ProtectedRoute from './ProtectedRoute';
import styles from './AdminSuspenseFallback.module.css';

// ========================================
// ייבוא דפים ציבוריים (eager loading)
// ========================================
import HomePage from '../pages/HomePage/index';
import ProductDetailPage from '../pages/ProductDetailPage/index';
import ProductsPage from '../pages/ProductsPage/index';
import CartPage from '../pages/CartPage/index';
import LoginPage from '../pages/LoginPage/index';
import RegisterPage from '../pages/RegisterPage/index';
import ProfilePage from '../pages/ProfilePage/index';
import ForgotPasswordPage from '../pages/ForgotPasswordPage/index';
import ResetPasswordPage from '../pages/ResetPasswordPage/index';
import UserSettings from '../pages/UserSettings/index';
import CheckoutPage from '../pages/CheckoutPage/index';
import OrderSuccessPage from '../pages/OrderSuccessPage/index';
import OrderHistoryPage from '../pages/OrderHistoryPage/index';
import MaintenancePage from '../pages/MaintenancePage/index';

// ========================================
// Lazy loading לכל דפי האדמין
// טעינה רק כשנכנסים לאזור הניהול
// ========================================
const AdminLayout = lazy(() => import('../pages/Admin/Layout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const OrdersPage = lazy(() => import('../pages/Admin/Orders'));
const ProductsManagementPage = lazy(() => import('../pages/Admin/Products'));
const CategoriesManagementPage = lazy(() => import('../pages/Admin/Categories'));
const CustomersPage = lazy(() => import('../pages/Admin/Customers'));
const CustomerGroupsPage = lazy(() => import('../pages/Admin/CustomerGroups'));
const UserManagementPage = lazy(() => import('../pages/Admin/UserManagement'));
const ReportsPage = lazy(() => import('../pages/Admin/Reports'));
const AdminSettingsPage = lazy(() => import('../pages/Admin/Settings'));
const BannersPage = lazy(() => import('../pages/Admin/Banners/BannersPage'));
const InventoryManagementPage = lazy(() => import('../pages/Admin/Inventory'));
const TestProductsRedux = lazy(() => import('../pages/Admin/TestProductsRedux'));
const FilterAttributesPage = lazy(() => import('../pages/Admin/FilterAttributes'));
const StockAlertsDashboard = lazy(() => import('../pages/Admin/StockAlerts'));

// ========================================
// קומפוננטת עזר - עוטפת רכיבים lazy עם Suspense
// ========================================
interface SuspenseWrapperProps {
  children: ReactNode;
}

const AdminSuspenseWrapper = ({ children }: SuspenseWrapperProps) => (
  <Suspense
    fallback={
      <div className={styles.loadingContainer}>
        ⏳ טוען אזור ניהול...
      </div>
    }
  >
    {children}
  </Suspense>
);

// ========================================
// הגדרת Router עם createBrowserRouter
// ========================================
export const router = createBrowserRouter([
  // ========================================
  // עמודים עצמאיים - מחוץ ל-Layout הרגיל (ללא Header/Footer)
  // ========================================
  {
    path: '/maintenance',
    element: <MaintenancePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  
  {
    // נתיב Root - עוטף את כל האפליקציה עם Layout (Header/Footer)
    path: '/',
    element: <RootLayout />,
    children: [
      // ========================================
      // דפי החנות הציבוריים
      // ========================================
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'category/:categoryId',
        element: <ProductsPage />,
      },
      {
        path: 'product/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },

      // ========================================
      // דפי משתמש מחובר
      // ========================================
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <UserSettings />
          </ProtectedRoute>
        ),
      },
      
      // ========================================
      // עמודי Checkout והזמנות
      // ========================================
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'order-success/:orderId',
        element: (
          <ProtectedRoute>
            <OrderSuccessPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute>
            <OrderHistoryPage />
          </ProtectedRoute>
        ),
      },

      // ========================================
      // Redirects מנתיבים ישנים לאזור הניהול החדש
      // ========================================
      {
        path: 'customer-groups',
        loader: () => {
          // שימוש ב-loader להפניה מחדש
          throw new Response('', {
            status: 302,
            headers: {
              Location: '/admin/customer-groups',
            },
          });
        },
      },
      {
        path: 'user-management',
        loader: () => {
          throw new Response('', {
            status: 302,
            headers: {
              Location: '/admin/user-management',
            },
          });
        },
      },

      // ========================================
      // אזור הניהול - נתיב אב עם הגנת הרשאות
      // ========================================
      {
        path: 'admin',
        element: (
          <ProtectedRoute requireAdmin={true}>
            <AdminSuspenseWrapper>
              <AdminLayout />
            </AdminSuspenseWrapper>
          </ProtectedRoute>
        ),
        children: [
          // נתיבי ילדים - כל דפי האדמין
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'products',
            element: <ProductsManagementPage />,
          },
          {
            path: 'categories',
            element: <CategoriesManagementPage />,
          },
          {
            path: 'customers',
            element: <CustomersPage />,
          },
          {
            path: 'customer-groups',
            element: <CustomerGroupsPage />,
          },
          {
            path: 'user-management',
            element: <UserManagementPage />,
          },
          {
            path: 'banners',
            element: <BannersPage />,
          },
          {
            // 📦 דף ניהול מלאי
            path: 'inventory',
            element: <InventoryManagementPage />,
          },
          {
            path: 'filter-attributes',
            element: <FilterAttributesPage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'settings',
            element: <AdminSettingsPage />,
          },
          {
            // 🔔 דף ניהול התראות מלאי
            path: 'stock-alerts',
            element: <StockAlertsDashboard />,
          },
          {
            // 🧪 דף בדיקת Redux (TDD)
            path: 'test-products',
            element: <TestProductsRedux />,
          },
        ],
      },
    ],
  },
]);
