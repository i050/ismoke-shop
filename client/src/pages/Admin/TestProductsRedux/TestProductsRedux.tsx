import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { fetchProducts } from '../../../store/slices/productsManagementSlice';

/**
 * 🧪 קומפוננטת בדיקה ל-Redux Products Management
 * 
 * מטרה: לוודא ש-Redux Slice + Service עובדים לפני בניית ה-UI המלא
 * 
 * בדיקות:
 * 1. ✅ dispatch(fetchProducts()) עובד
 * 2. ✅ loading state משתנה (true → false)
 * 3. ✅ products מגיעים מהשרת
 * 4. ✅ error handling עובד (אם יש בעיה)
 */
export const TestProductsRedux = () => {
  const dispatch = useAppDispatch();
  const { 
    products = [], 
    loading = false, 
    error = null, 
    cursor = null, 
    hasMore = false 
  } = useAppSelector(
    (state) => state.productsManagement || {}
  );

  // טעינת מוצרים בהתחלה
  useEffect(() => {
    console.log('🔥 Fetching products...');
    const resultPromise = dispatch(fetchProducts({}));
    
    // בדיקה מה ה-API החזיר
    resultPromise.then((result) => {
      console.log('🎯 API Response:', result);
    }).catch((err) => {
      console.error('❌ API Error:', err);
    });
  }, [dispatch]);

  // לוג לכל שינוי ב-state
  useEffect(() => {
    console.log('📊 State changed:', {
      productsCount: products?.length || 0,
      loading,
      error,
      cursor,
      hasMore,
    });
  }, [products, loading, error, cursor, hasMore]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Redux Products Test</h1>

      {/* סטטוס Redux */}
      <div className="space-y-4 bg-gray-100 p-4 rounded mb-6">
        <div>
          <strong>Loading:</strong> {loading ? '⏳ Yes' : '✅ No'}
        </div>
        <div>
          <strong>Error:</strong>{' '}
          {error ? <span className="text-red-600">❌ {error}</span> : '✅ None'}
        </div>
        <div>
          <strong>Products Count:</strong> {products.length}
        </div>
        <div>
          <strong>Has More:</strong> {hasMore ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Cursor:</strong> {cursor || 'null'}
        </div>
      </div>

      {/* הצגת מוצרים */}
      {products.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">📦 מוצרים ({products.length}):</h2>
          <div className="space-y-2">
            {products.slice(0, 5).map((product) => (
              <div
                key={product._id}
                className="p-3 bg-white rounded shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      {product.basePrice}₪
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {product.description}
                      </div>
                    )}
                  </div>
                  <div>
                    {product.isActive ? (
                      <span className="text-green-600 text-xs">✅ פעיל</span>
                    ) : (
                      <span className="text-red-600 text-xs">❌ לא פעיל</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {products.length > 5 && (
            <p className="text-gray-600 mt-2">ועוד {products.length - 5} מוצרים...</p>
          )}

          {/* כפתור לטעינת עוד */}
          {hasMore && (
            <button
              onClick={() => {
                console.log('🔄 Loading more products with cursor:', cursor);
                dispatch(fetchProducts({ cursor }));
              }}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ טוען...' : '📥 טען עוד'}
            </button>
          )}
        </div>
      )}

      {/* אם אין מוצרים ולא טוען */}
      {!loading && products.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <p>🤷‍♂️ אין מוצרים במערכת</p>
          <p className="text-sm mt-2">
            (בדוק אם השרת רץ או אם יש מוצרים ב-DB)
          </p>
        </div>
      )}

      {/* הוראות שימוש */}
      <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">📋 מה לבדוק:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ Loading משתנה מ-Yes ל-No</li>
          <li>✅ Products Count גדול מ-0</li>
          <li>✅ רשימת מוצרים מוצגת</li>
          <li>✅ בConsole (F12) יש logs של state changes</li>
          <li>✅ כפתור "טען עוד" עובד (אם hasMore = Yes)</li>
        </ul>
      </div>

      {/* קישור לדף האמיתי */}
      <div className="mt-4 text-center">
        <a
          href="/admin/products-management"
          className="text-blue-600 hover:underline text-sm"
        >
          ← חזור לדף ניהול מוצרים
        </a>
      </div>
    </div>
  );
};
