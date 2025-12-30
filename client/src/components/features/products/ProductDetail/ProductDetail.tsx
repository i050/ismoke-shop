import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Breadcrumbs, Button, LogoLoader } from '@ui';
import { Icon } from '../../../ui';
import ProductGallery from '../ProductGallery';
import ProductTabs from '../ProductTabs';
import RelatedProducts from '../RelatedProducts';
import VariantSelector from '../VariantSelector';
import ProductPrice from '../ProductPrice';
import QuantitySelector from '../../../ui/QuantitySelector';
import StockAlertButton from '../StockAlertButton';
import type { Product } from '../../../../types';
import { ProductService } from '../../../../services/productService';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { addItemToCart, openMiniCart } from '../../../../store/slices/cartSlice';
import styles from './ProductDetail.module.css';

interface ProductDetailProps {
  productId: string;
}

/**
 * רכיב פרטי מוצר - הרכיב הראשי שמציג את כל המידע על המוצר
 * מחקה את המבנה והעיצוב של ה-HTML המצורף בדיוק
 */
const ProductDetail: React.FC<ProductDetailProps> = ({ productId }) => {
  const dispatch = useAppDispatch();
  
  // קבלת אימייל המשתמש המחובר (אם קיים)
  const user = useAppSelector((state) => state.auth.user);
  const userEmail = user?.email || '';
  
  // קבלת פריטי העגלה לחישוב מלאי אפקטיבי
  const cartItems = useAppSelector((state) => state.cart.cart?.items || []);

  // מצבי הרכיב
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [transientBanner, setTransientBanner] = useState<string | null>(null);

  // מצבי אינטראקציה
  const [selectedSku, setSelectedSku] = useState<string | null>(null); // מזהה SKU נבחר במקום אינדקס
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  // מצב להצגת הודעת מלאי זמנית (כאשר המשתמש מנסה לעבור את המקסימום)
  const [forceShowStockMessage, setForceShowStockMessage] = useState(false);
  const [lastStockMessage, setLastStockMessage] = useState<string | null>(null);
  const forceTimerRef = useRef<number | null>(null);
  const clearMessageTimerRef = useRef<number | null>(null);
  const productStockControllerRef = useRef<AbortController | null>(null);
  const STOCK_PILL_DURATION = 3500; // מומלץ על ידי מומחה UX
  const STOCK_PILL_TRANSITION = 260; // תואם ל-css transition

  // טעינת נתוני המוצר
  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        const productData = await ProductService.getProductById(productId);
        setProduct(productData);
        // הגדרת SKU ברירת מחדל (הראשון ברשימה)
        if (productData.skus && productData.skus.length > 0) {
          setSelectedSku(productData.skus[0].sku);
        }
        setError(null);
        setTransientBanner(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = (err as any)?.status as number | undefined;
        // Treat client/business errors as transient (no full-page takeover)
        if (status && status < 500 && status !== 404) {
          setTransientBanner(message || 'שגיאה בטעינת פרטי המוצר');
          setError(null);
        } else {
          // 404 (not found) and 5xx are treated as page-level errors
          setError({ message: message || 'שגיאה בטעינת פרטי המוצר', status });
        }
        console.error('Error loading product:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // טיפול בשינוי SKU
  const handleSkuChange = (sku: string) => {
    setSelectedSku(sku);
  };

  // חישוב המלאי הרלוונטי - חיפוש SKU נבחר במערך ה-SKUs
  const selectedSkuData = product?.skus?.find(s => s.sku === selectedSku);
  const totalStock = selectedSkuData?.stockQuantity ?? product?.quantityInStock ?? 0;
  
  // חישוב מחיר דינמי בהתבסס על SKU נבחר והנחת קבוצה
  const selectedSkuPricing = useMemo(() => {
    if (!product) return undefined;
    
    // אם אין SKU נבחר, החזר את ה-pricing הרגיל של המוצר
    if (!selectedSkuData) {
      return product.pricing;
    }

    // אם ל-SKU הנבחר יש מחיר משלו (override), השתמש בו
    const skuBasePrice = selectedSkuData.price ?? product.basePrice;
    
    // אם יש pricing מהשרת עם הנחה, החל את אחוז ההנחה על המחיר של ה-SKU
    if (product.pricing?.hasDiscount) {
      const discountedPrice = skuBasePrice * (1 - (product.pricing.discountPercentage || 0) / 100);
      return {
        ...product.pricing,
        originalPrice: skuBasePrice,
        finalPrice: Math.round(discountedPrice * 100) / 100
      };
    }

    // אם אין הנחה, רק אם המחיר שונה מהמחיר הבסיסי של המוצר
    if (skuBasePrice !== product.basePrice) {
      return {
        productId: product._id,
        originalPrice: skuBasePrice,
        finalPrice: skuBasePrice,
        discountPercentage: 0,
        hasDiscount: false
      };
    }

    // אחרת, השתמש ב-pricing הרגיל
    return product.pricing;
  }, [selectedSkuData, product]);
  
  // חישוב כמה יחידות מה-SKU הנבחר נמצאות בעגלה של המשתמש
  const quantityInCart = useMemo(() => {
    if (!selectedSku || !product) return 0;
    const cartItem = cartItems.find(item => 
      item.productId === product._id && item.sku === selectedSku
    );
    return cartItem?.quantity || 0;
  }, [cartItems, product?._id, selectedSku]);
  
  // חישוב מלאי אפקטיבי = מלאי כולל פחות מה שבעגלה שלי
  const effectiveStock = totalStock - quantityInCart;
  
  // האם כל המלאי נמצא בעגלה שלי?
  const allStockInMyCart = quantityInCart > 0 && effectiveStock <= 0;
  
  // מלאי זמין להוספה לעגלה (מתבסס על המלאי האפקטיבי)
  const availableStock = effectiveStock > 0 ? effectiveStock : 0;

  // פונקציה להצגת ה-pill של מלאי לזמן קצר
  const showStockPill = async (stockParam?: number) => {
    // ביטול טיימאוטים קודמים
    if (forceTimerRef.current) {
      window.clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
    if (clearMessageTimerRef.current) {
      window.clearTimeout(clearMessageTimerRef.current);
      clearMessageTimerRef.current = null;
    }

    // הצגת הודעה ראשונית מבוססת על המצב הנוכחי (מידע מה-state) כדי לתת משוב מהיר
    const fallbackStock = typeof stockParam === 'number' ? stockParam : availableStock;
    const fallbackMessage = fallbackStock > 0 ? `במלאי יש רק ${fallbackStock} יחידות` : 'אזל מהמלאי';
    setLastStockMessage(fallbackMessage);
    setForceShowStockMessage(true);

    // נסיון לקבל נתוני מלאי מעודכנים מהשרת (revalidate)
    try {
      // ביטול בקשה קודמת אם קיימת
      if (productStockControllerRef.current) {
        productStockControllerRef.current.abort();
        productStockControllerRef.current = null;
      }
      const controller = new AbortController();
      productStockControllerRef.current = controller;

      const fresh = await ProductService.getProductById(productId, controller.signal);
      // חישוב מלאי לפי SKU נבחר
      const freshSku = fresh.skus?.find(s => s.sku === selectedSku);
      const freshStock = freshSku?.stockQuantity ?? fresh.quantityInStock ?? 0;

      // אם הערך שונה מה‑fallback, עדכנו את ההודעה
      if (freshStock !== fallbackStock) {
        const message = freshStock > 0 ? `במלאי יש רק ${freshStock} יחידות` : 'אזל מהמלאי';
        setLastStockMessage(message);
      }

      // סיימנו עם controller זה
      productStockControllerRef.current = null;
    } catch (err) {
      // אם התבצעה שגיאה או ביטול - נשמור את ההודעה fallback
      // אין צורך לטפל כאן, כי כבר הצגנו את ההודעה הראשונית
    }

    // תוכנית סגירה אחידה: לאחר פרק הזמן המומלץ נסגר ה-pill
    forceTimerRef.current = window.setTimeout(() => {
      setForceShowStockMessage(false);
      forceTimerRef.current = null;
      clearMessageTimerRef.current = window.setTimeout(() => {
        setLastStockMessage(null);
        clearMessageTimerRef.current = null;
      }, STOCK_PILL_TRANSITION);
    }, STOCK_PILL_DURATION);
  };

  // ניקוי טיימאוטים בעת unmount
  useEffect(() => {
    return () => {
      if (forceTimerRef.current) {
        window.clearTimeout(forceTimerRef.current);
        forceTimerRef.current = null;
      }
      if (clearMessageTimerRef.current) {
        window.clearTimeout(clearMessageTimerRef.current);
        clearMessageTimerRef.current = null;
      }
    };
  }, []);

  // טיפול בשינוי כמות
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  // כאשר נבחר ווריאנט חדש או שהמלאי משתנה, נבטיח שהכמות תתאים למלאי הקיים
  useEffect(() => {
    if (!product) return;
    const stock = availableStock;
    if (stock <= 0) {
      // אם אין מלאי - נעדכן את הכמות ל-0
      if (quantity !== 0) setQuantity(0);
    } else {
      // אם הכמות הנוכחית גדולה מהמלאי - נסגור אותה ונציג pill למשתמש
      if (quantity > stock) {
        setQuantity(stock);
        showStockPill(stock);
      } else if (quantity < 1) {
        setQuantity(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSku, product?.quantityInStock]);

  // הוספה לעגלה
  const handleAddToCart = async () => {
    if (!product || !selectedSku) return;

    // בדיקה מהירה בשרת לפני שליחה כדי להבטיח שאיננו מוסיפים יותר מהמלאי האמיתי
    try {
      const fresh = await ProductService.getProductById(productId);
      const freshSku = fresh.skus?.find(s => s.sku === selectedSku);
      const freshStock = freshSku?.stockQuantity ?? fresh.quantityInStock ?? 0;
      if (quantity > freshStock) {
        // עדכון הכמות להיקף המקסימלי והצגת ה-pill
        setQuantity(freshStock > 0 ? freshStock : 0);
        showStockPill(freshStock);
        return;
      }
    } catch (err) {
      // אם יש שגיאה בבדיקה, נמשיך וניתן ל-thunk להתמודד עם השגיאה מהשרת
      console.warn('Could not revalidate stock before addToCart:', err);
    }

    // שליחת הפעולה ל-Redux עם מזהה SKU
    dispatch(addItemToCart({
      productId: product._id,
      quantity,
      sku: selectedSku // שליחת קוד SKU במקום variantIndex
    }));
  };

  // קנייה ישירה - שליחת פרטי המוצר ישירות ל-Checkout (בלי להוסיף לעגלה)
  const navigate = useNavigate();
  const handleBuyNow = async () => {
    if (!product || !selectedSku || !selectedSkuData) return;

    // בדיקה מהירה בשרת להבטחת מלאי
    try {
      const fresh = await ProductService.getProductById(productId);
      const freshSku = fresh.skus?.find(s => s.sku === selectedSku);
      const freshStock = freshSku?.stockQuantity ?? fresh.quantityInStock ?? 0;
      if (quantity > freshStock) {
        setQuantity(freshStock > 0 ? freshStock : 0);
        showStockPill(freshStock);
        return;
      }
    } catch (err) {
      console.warn('Could not revalidate stock before buyNow:', err);
    }

    // חישוב מחיר סופי (מה-SKU או מהמוצר)
    const finalPrice = selectedSkuPricing?.finalPrice ?? selectedSkuData.price ?? product.basePrice;
    
    // תמונה ראשית להצגה - מ-currentImages (וריאנט אם קיים, אחרת מוצר)
    const productImage = currentImages[0]?.medium || currentImages[0]?.thumbnail || '';

    // ניווט ל-Checkout עם פרטי המוצר (בלי להוסיף לעגלה)
    navigate('/checkout', {
      state: {
        buyNowItem: {
          productId: product._id,
          name: product.name,
          price: finalPrice,
          quantity,
          image: productImage,
          sku: selectedSku,
          variant: {
            color: selectedSkuData.attributes?.color,
            size: selectedSkuData.attributes?.size,
          },
        }
      }
    });
  };

  // הוספה למועדפים
  // const handleAddToFavorites = () => {
  //   console.log('הוספה למועדפים:', product?._id);
  // };

  // שיתוף המוצר
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } else {
      // fallback - העתקה ללוח
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // שילוב תמונות וריאנט + מוצר (memo לביצועים - מונע renders מיותרים)
  // ✅ החזרת IImage[] ישירות - ProductGallery יטפל בבחירת הגדלים
  const currentImages = useMemo(() => {
    // תמונות הוריאנט הנבחר (משתנות לפי צבע)
    const variantImages = selectedSkuData?.images && selectedSkuData.images.length > 0
      ? selectedSkuData.images // ✅ IImage[] ישירות
      : [];
    
    // תמונות המוצר הכלליות (קבועות לכל הצבעים)
    const productImages = product?.images && product.images.length > 0
      ? product.images // ✅ IImage[] ישירות
      : [];
    
    // 🎯 שילוב: תמונות וריאנט קודם, אחר כך תמונות מוצר
    // דוגמה: [כחול1, כחול2, כחול3, פיצ'רים, גודל, אריזה]
    return [...variantImages, ...productImages];
  }, [selectedSkuData?.images, product?.images]);

  // איפוס הגלריה לתמונה הראשונה כשמשנים ווריאנט
  // כך המשתמש יראה מיד את התמונה הראשונה של הצבע החדש
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedSku]);

  // מצב טעינה
  if (loading) {
    return (
      <div className={styles.container}>
        <LogoLoader />
      </div>
    );
  }
  // transient banner for non-fatal issues
  if (transientBanner) {
    // render the page but show a small banner at the top
  }

  // מצב שגיאה - רק אם שגיאה פאטלית או מוצר לא נמצא
  if ((error && (error.status === 404 || (error.status && error.status >= 500))) || !product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <Icon name="AlertCircle" size={48} className={styles.errorIcon} />
          <Typography variant="h2" color="error" align="center">
            {error?.message || 'מוצר לא נמצא'}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {transientBanner && (
        <div className={styles.transientBanner} role="status" aria-live="polite">
          {transientBanner}
        </div>
      )}
      {/* Breadcrumb Navigation - בדיוק כמו ב-HTML */}
      <nav className={styles.breadcrumb}>
        <Breadcrumbs
          items={[
            { label: 'בית', path: '/' },
            { label: 'מוצרים', path: '/products' },
            { label: product.name }
          ]}
        />
      </nav>

      {/* Product Header - כותרת וכוכבים */}
      <header className={styles.productHeader}>
        <Typography variant="h1" className={styles.productTitle}>
          {product.name}
        </Typography>

        <div className={styles.productMeta}>
          <div className={styles.rating}>
            <div className={styles.stars}>
              {/* {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name="Star"
                  size={20}
                  className={`${styles.star} ${star <= 4 ? styles.filled : ''}`}
                />
              ))} */}
            </div>
            {/* <span className={styles.reviewCount}>(42 ביקורות)</span> */}
          </div>
          <div className={styles.productSku}>
            מק"ט: {selectedSku || `PROD-${product._id.slice(-6)}`}
          </div>
        </div>
      </header>

      {/* Product Main - החלק המרכזי עם grid */}
      <main className={styles.productMain}>

        {/* גלריית תמונות - צד שמאל (ימין ב-RTL) */}
        <div className={styles.productImages}>
          <ProductGallery
            images={currentImages}
            productName={product.name}
            currentIndex={currentImageIndex}
            onImageChange={setCurrentImageIndex}
            selectedSku={selectedSku}
          />
        </div>

        {/* פרטי המוצר - צד ימין (שמאל ב-RTL) */}
        <div className={styles.productDetails}>

          {/* מחיר */}
          <div className={styles.priceSection}>
            <ProductPrice
              pricing={selectedSkuPricing}
              size="large"
            />
          </div>

          {/* בחירת SKU (צבע/גודל) */}
          {product.skus && product.skus.length > 0 && (
            <div className={styles.colorSelection}>
              <VariantSelector
                skus={product.skus}
                selectedSku={selectedSku}
                onSkuChange={handleSkuChange}
                showColorPreview={true}
              />
            </div>
          )}

          {/* בחירת כמות */}
          <div className={styles.quantitySection}>
            <Typography variant="body1" className={styles.quantityLabel}>
              כמות:
            </Typography>
            <div className={styles.quantityWrapper}>
              <QuantitySelector
                value={quantity}
                min={availableStock > 0 ? 1 : 0}
                max={availableStock}
                onChange={handleQuantityChange}
                onOverMax={() => showStockPill()}
                size="medium"
              />
              <div
                className={`${styles.stockPill} ${forceShowStockMessage ? styles.stockPillVisible : ''}`}
                role="alert"
                //                aria-hidden={forceShowStockMessage ? undefined : "true"} שינוי

                {...(!forceShowStockMessage && { 'aria-hidden': 'true' })}
              >
                {lastStockMessage ? (
                  <>
                    <Icon name="AlertTriangle" size={14} className={styles.pillIcon} />
                    <span>{lastStockMessage}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* מצב מלאי */}
          <div className={styles.stockStatus}>
            {allStockInMyCart ? (
              /* כל המלאי בעגלה שלי - הודעה מיוחדת */
              <div className={styles.allInCart}>
                <Icon name="ShoppingCart" size={18} />
                <Typography variant="body2">
                  כל {totalStock} היחידות הזמינות נמצאות בעגלה שלך
                </Typography>
              </div>
            ) : availableStock > 0 ? (
              <div className={styles.inStock}>
                <Icon name="CheckCircle2" size={18} />
                <Typography variant="body2">במלאי</Typography>
              </div>
            ) : (
              <div className={styles.outOfStock}>
                <Icon name="XCircle" size={18} />
                <Typography variant="body2">אזל מהמלאי</Typography>
              </div>
            )}
          </div>

          {/* כפתורי פעולה */}
          <div className={styles.actionButtons}>
            {allStockInMyCart ? (
              /* כל המלאי בעגלה שלי - הודעה מיוחדת + כפתור התראה */
              <>
                <div className={styles.allInCartBanner}>
                  <Icon name="ShoppingCart" size={22} />
                  <div className={styles.allInCartBannerText}>
                    <span className={styles.allInCartTitle}>כל היחידות בעגלה שלך!</span>
                    <span className={styles.allInCartSubtitle}>
                      יש לך {totalStock} יחידות ממוצר זה 
                      <span 
                        className={styles.cartLink}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dispatch(openMiniCart());
                        }}
                      >
                        בעגלה שלך
                      </span>
                    </span>
                  </div>
                </div>
                <StockAlertButton
                  productId={product._id}
                  productName={product.name}
                  skuCode={selectedSku || undefined}
                  userEmail={userEmail}
                />
              </>
            ) : availableStock > 0 ? (
              /* מוצר במלאי - הצגת כפתורי קנייה */
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  elevated
                  icon={<Icon name="ShoppingCart" size={20} />}
                  onClick={handleAddToCart}
                >
                  הוסף לעגלה
                </Button>

                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  elevated
                  icon={<Icon name="CreditCard" size={20} />}
                  onClick={handleBuyNow}
                >
                  קנה עכשיו
                </Button>
              </>
            ) : (
              /* מוצר אזל - הצגת כפתור התראת מלאי */
              <StockAlertButton
                productId={product._id}
                productName={product.name}
                skuCode={selectedSku || undefined}
                userEmail={userEmail}
              />
            )}
          </div>

          {/* פעולות משניות */}
          <div className={styles.secondaryActions}>
            {/* <Button
              variant="ghost"
              size="md"
              icon={<Icon name="Heart" size={20} />}
              onClick={handleAddToFavorites}
            >
              הוסף למועדפים
            </Button> */}
            <Button
              variant="ghost"
              size="md"
              icon={<Icon name="Share2" size={20} />}
              onClick={handleShare}
            >
              שתף
            </Button>
          </div>
        </div>
      </main>

      {/* כרטיסיות מידע */}
      <div className={styles.productTabs}>
        <ProductTabs
          product={product}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* מוצרים קשורים */}
      <div className={styles.relatedProducts}>
        <RelatedProducts
          currentProductId={product._id}
          categoryId={product.categoryId}
        />
      </div>
    </div>
  );
};

export default ProductDetail;
