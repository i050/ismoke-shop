import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './ProtectedRoute';
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
import MaintenancePage from '../pages/MaintenancePage/index';

// Lazy loading לכל דפי האדמין - טעינה רק כשנכנסים לאזור הניהול
const AdminLayout = lazy(() => import('../pages/Admin/Layout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const OrdersPage = lazy(() => import('../pages/Admin/Orders'));
const ProductsManagementPage = lazy(() => import('../pages/Admin/Products'));
const FilterAttributesPage = lazy(() => import('../pages/Admin/FilterAttributes'));
const CustomersPage = lazy(() => import('../pages/Admin/Customers'));
const CustomerGroupsPage = lazy(() => import('../pages/Admin/CustomerGroups'));
const UserManagementPage = lazy(() => import('../pages/Admin/UserManagement'));
const ReportsPage = lazy(() => import('../pages/Admin/Reports'));
const AdminSettingsPage = lazy(() => import('../pages/Admin/Settings'));
const BannersPage = lazy(() => import('../pages/Admin/Banners/BannersPage'));
const InventoryManagementPage = lazy(() => import('../pages/Admin/Inventory'));
const BrandsManagementPage = lazy(() => import('../pages/Admin/BrandsManagement/BrandsManagementPage'));
const TestProductsRedux = lazy(() => import('../pages/Admin/TestProductsRedux'));

const AppRoutes = () => {
  return (
    <Routes>
      {/* עמוד תחזוקה - נגיש תמיד */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      
      {/* דפי החנות הציבוריים */}
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/category/:categoryId" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* דפי משתמש מחובר */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />

      {/* Redirects מנתיבים ישנים לאזור הניהול החדש */}
      <Route path="/customer-groups" element={<Navigate to="/admin/customer-groups" replace />} />
      <Route path="/user-management" element={<Navigate to="/admin/user-management" replace />} />

      {/* אזור הניהול - נתיב אב עם הגנת הרשאות */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.5rem',
                color: '#6366f1'
              }}>
                ⏳ טוען אזור ניהול...
              </div>
            }>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        {/* נתיבי ילדים - כל דפי האדמין */}
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<ProductsManagementPage />} />
        <Route path="filter-attributes" element={<FilterAttributesPage />} />
        <Route path="brands" element={<BrandsManagementPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customer-groups" element={<CustomerGroupsPage />} />
        <Route path="user-management" element={<UserManagementPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="inventory" element={<InventoryManagementPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        {/* 🧪 דף בדיקת Redux (TDD) */}
        <Route path="test-products" element={<TestProductsRedux />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
