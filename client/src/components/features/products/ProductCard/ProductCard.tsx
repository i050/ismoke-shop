import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// ייבוא רכיבי UI - שימוש בכפתורים וטיפוגרפיה מהספרייה המקומית
import { Button, Typography, Icon } from '../../../ui';
// ייבוא מודול CSS לשימוש במחלקות מקוריות
import styles from './ProductCard.module.css';
// ייבוא רכיב המחיר המתקדם החדש
import ProductPrice from '../ProductPrice';
// ייבוא בורר ווריאנטים
import VariantSelector from '../VariantSelector';
// ייבוא רכיב כפתור התראת מלאי
import StockAlertButton from '../StockAlertButton';
// ייבוא Popover לבחירת כמות לפני הוספה לסל
import AddToCartPopover from '../../../ui/AddToCartPopover';
// ייבוא הטיפוסים המרכזיים
import type { Product } from '../../../../types';
// ייבוא hook ל-Redux לקבלת מידע משתמש ומידע על העגלה
import { useAppSelector } from '../../../../hooks/reduxHooks';
// ייבוא ProductService עבור Prefetch אופטימיזציה
import { ProductService } from '../../../../services/productService';
// ייבוא hook ל-WebSocket לעדכון מחירים בזמן אמת
// Phase 1.4: ייבוא פונקציות עזר לטיפול בתמונות
import { getImageUrl } from '../../../../utils/imageUtils'; // ✅ שימוש בפונקציה החדשה עם בחירת גודל
import { useProductsRealtimeContext } from '../ProductsRealtime';
// הסרת תלויות ב-Framer Motion - נחזור לאנימציות מבוססות CSS במודול

// הגדרת הטיפוסים - מה ה-ProductCard יכול לקבל כ-props
interface ProductCardProps {
  product: Product & {
    // שדות נוספים לתאימות עם רכיבי UI קיימים
    id?: string;                   // מזהה מתחלף ל-_id (לתאימות לאחור)
    price?: number;                // מחיר מתחלף ל-basePrice (לתאימות לאחור)
    imageUrl?: string;             // תמונה יחידה (לתאימות לאחור)
    inStock?: boolean;             // מתבסס על quantityInStock
    isOnSale?: boolean;            // מתבסס על pricing.hasDiscount
    discountPercentage?: number;   // מתבסס על pricing.discountPercentage
  };
  variant?: 'grid' | 'carousel';                // חדש: וריאנט עיצובי - grid לגריד, carousel לקרוסלות
  onAddToCart?: (product: Product, sku?: string, quantity?: number) => void; // פונקציה להוספה לסל עם קוד SKU וכמות
  onProductClick?: (productId: string) => void; // פונקציה לקליק על המוצר - אופציונלי
  className?: string;                           // קלאס נוסף - אופציונלי
}

// הגדרת דגל דיבאג הנשלט ע"י משתני הסביבה (כיבוי לוגים כברירת מחדל בסביבת פרודקשן)
const SHOULD_DEBUG_PRODUCT_LOGS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PRODUCT_DEBUG === 'true';

// פונקציית עזר ללוגים מותנים כדי למנוע רעשים בקונסולה
const debugProductLog = (...args: unknown[]) => {
  if (SHOULD_DEBUG_PRODUCT_LOGS) {
    console.debug(...args);
  }
};

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',              // ברירת מחדל: grid - לשימוש בגריד מוצרים
  onAddToCart,
  onProductClick,
  className = ''
}) => {
  // יצירת מזהה אחוד (עדיפות ל-_id, פולבק ל-id)
  const productId = product._id || product.id || '';
  // שאיבת הקשר realtime להדגשת רענונים ברמת הכרטיס
  const { lastGroupUpdateAt } = useProductsRealtimeContext();
  
  // קבלת אימייל המשתמש המחובר (אם קיים) - לטופס התראת מלאי
  const user = useAppSelector((state) => state.auth.user);
  const userEmail = user?.email || '';
  
  // קבלת פריטי העגלה לחישוב מלאי אפקטיבי
  const cartItems = useAppSelector((state) => state.cart.cart?.items || []);
  
  // State לניהול התמונה הנוכחית המוצגת
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // State ל-SKU נבחר (קוד SKU, לא אינדקס) - אתחול עם ה-SKU הראשון אם קיים
  const [selectedSku, setSelectedSku] = useState<string | null>(
    product.skus && product.skus.length > 0 ? product.skus[0].sku : null
  );
  
  // חישוב כמה יחידות מה-SKU הנבחר נמצאות בעגלה של המשתמש
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const quantityInCart = React.useMemo(() => {
    if (!selectedSku) return 0;
    const cartItem = cartItems.find(item => 
      item.productId === productId && item.sku === selectedSku
    );
    return cartItem?.quantity || 0;
  }, [cartItems, productId, selectedSku]);
  
  // חישוב המלאי הכולל של ה-SKU הנבחר
  const totalStock = React.useMemo(() => {
    if (!selectedSku || !product.skus) {
      return product.quantityInStock || 0;
    }
    const skuData = product.skus.find(s => s.sku === selectedSku);
    return skuData?.stockQuantity ?? product.quantityInStock ?? 0;
  }, [selectedSku, product.skus, product.quantityInStock]);
  
  // חישוב מלאי אפקטיבי = מלאי כולל פחות מה שבעגלה שלי
  const effectiveStock = totalStock - quantityInCart;
  
  // בדיקת מצב מלאי (משתמש במלאי אפקטיבי אם יש פריטים בעגלה)
  const isInStock = effectiveStock > 0;
  
  // State למחיר מעודכן - נשען על רענון מהעמוד הראשי ומסונכרן עם props
  const [updatedProduct, setUpdatedProduct] = useState(product);
  // State מקומי לדגל אנימציית רענון קלה בעת הגעה של אירוע socket
  const [isRealtimeRefreshing, setIsRealtimeRefreshing] = useState(false);

  // חישוב דינמי של ה-SKU הנבחר (לשימוש בתמונות ומחיר)
  const selectedSkuData = React.useMemo(() => {
    return product.skus?.find(s => s.sku === selectedSku);
  }, [product.skus, selectedSku]);

  // חישוב מחיר דינמי בהתבסס על SKU נבחר והנחת קבוצה
  const selectedSkuPricing = React.useMemo(() => {
    // אם אין SKU נבחר, החזר את ה-pricing הרגיל של המוצר
    if (!selectedSkuData) {
      return updatedProduct.pricing;
    }

    // אם ל-SKU הנבחר יש מחיר משלו (override), השתמש בו
    const skuBasePrice = selectedSkuData.price ?? updatedProduct.basePrice;
    
    // אם יש pricing מהשרת עם הנחה, החל את אחוז ההנחה על המחיר של ה-SKU
    if (updatedProduct.pricing?.hasDiscount) {
      const discountedPrice = skuBasePrice * (1 - (updatedProduct.pricing.discountPercentage || 0) / 100);
      return {
        ...updatedProduct.pricing,
        originalPrice: skuBasePrice,
        finalPrice: Math.round(discountedPrice * 100) / 100
      };
    }

    // אם אין הנחה, רק אם המחיר שונה מהמחיר הבסיסי של המוצר
    if (skuBasePrice !== updatedProduct.basePrice) {
      return {
        productId: updatedProduct._id,
        originalPrice: skuBasePrice,
        finalPrice: skuBasePrice,
        discountPercentage: 0,
        hasDiscount: false
      };
    }

    // אחרת, השתמש ב-pricing הרגיל
    return updatedProduct.pricing;
  }, [selectedSkuData, updatedProduct.pricing, updatedProduct.basePrice, updatedProduct._id]);

  // חישוב דינמי של רשימת תמונות לפי SKU נבחר (אחרי הגדרת ה-state!)
  // אם יש SKU נבחר עם תמונות משלו - השתמש בהן, אחרת השתמש בתמונות המוצר הראשי
  // ✅ שימוש במערך IImage[] ישירות - לא צריך להמיר ל-URLs
  const productImages = React.useMemo(() => {
    // בדיקה אם ל-SKU הנבחר יש תמונות
    if (selectedSkuData?.images && selectedSkuData.images.length > 0) {
      return selectedSkuData.images; // ✅ החזרת IImage[] ישירות
    }
    // אחרת, השתמש בתמונות המוצר הראשי
    if (product.images && product.images.length > 0) {
      return product.images; // ✅ החזרת IImage[] ישירות
    }
    // פולבק ל-imageUrl אם קיים (תאימות לאחור)
    if (product.imageUrl) {
      return [product.imageUrl]; // string - getImageUrl יטפל בזה
    }
    return []; // אם אין כלום - מערך ריק
  }, [selectedSkuData, product.images, product.imageUrl]);

  // לוג מותנה לבדיקת נתוני SKU בעת פיתוח בלבד
  React.useEffect(() => {
    debugProductLog('🏷️ ProductCard - טעינת מוצר:', {
      productId: product._id,
      productName: product.name,
      hasSkus: !!product.skus,
      skusCount: product.skus?.length || 0,
      skus: product.skus?.map(s => ({
        sku: s.sku,
        name: s.name,
        color: s.attributes?.color,
        size: s.attributes?.size
      })),
      selectedSku,
      selectorWillShow: (product.skus?.length || 0) > 0,
      pricing: product.pricing // הדפס את ה-pricing
    });
  }, [product._id, product.name, product.skus, selectedSku]);

  // סנכרון state המחיר כאשר מתקבל מוצר רענן מהעמוד (פעם אחת פר fetch)
  React.useEffect(() => {
    setUpdatedProduct(product);
  }, [product]);

  // הדגשת רענון כאשר יש אירוע socket חדש שנקלט בהקשר השיתופי
  React.useEffect(() => {
    if (!lastGroupUpdateAt) {
      return;
    }
    setIsRealtimeRefreshing(true);
    const timeoutId = window.setTimeout(() => {
      setIsRealtimeRefreshing(false);
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [lastGroupUpdateAt]);

  // פונקציה למעבר לתמונה הבאה
  const nextImage = (e: React.MouseEvent) => {
    // מניעת ניווט של ה-Link הורה: אין צורך שהלחיצה על החץ תנווט לדף המוצר
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  // פונקציה למעבר לתמונה הקודמת
  const prevImage = (e: React.MouseEvent) => {
    // מניעת ניווט של ה-Link הורה: אין צורך שהלחיצה על החץ תנווט לדף המוצר
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };
  // פונקציה לטיפול בקליק על המוצר
  const handleProductClick = () => {
    if (onProductClick) {
      onProductClick(productId);
    }
  };

  // פונקציה לשינוי SKU (על ידי קוד SKU)
  const handleSkuChange = (sku: string) => {
    const skuData = product.skus?.find(s => s.sku === sku);
    debugProductLog('🔄 ProductCard - שינוי SKU:', {
      productId: product._id,
      productName: product.name,
      oldSku: selectedSku,
      newSku: sku,
      skuData
    });
    setSelectedSku(sku);
    // איפוס אינדקס התמונה כי עכשיו יש רשימת תמונות חדשה
    setCurrentImageIndex(0);
  };

  // איסוף שמות המחלקות לשורש הכרטיס (מנוע טעויות ב־JSX על שימוש ב־template literals מורכבים)
  const rootClassName = [styles.productCard, variant === 'grid' ? styles.grid : styles.carousel, className].filter(Boolean).join(' ');
  
  // ✅ קבלת URL התמונה הנוכחית ב-thumbnail (200×200) - ביצועים מקסימליים!
  const currentImageUrl = productImages[currentImageIndex]
    ? getImageUrl(productImages[currentImageIndex], 'thumbnail')
    : '/ismoke-placeholder.png';

  return (
    <Link 
      to={`/product/${productId}`} 
      className={styles.productLink}
      onPointerEnter={() => {
        // 🚀 Prefetch עבור Product Details כשהמשתמש מעביר עליה את העכבר
        // זה חוסך 200-500ms כשהמשתמש בעצם לוחץ על הקישור
        ProductService.preFetchProductById(productId);
      }}
    >
      <div
        className={rootClassName}
        onClick={handleProductClick}
        data-refreshing={isRealtimeRefreshing ? 'true' : undefined}
      >
        {/* אזור תמונה */}
        <div className={styles.imageContainer}>
          {productImages.length > 0 ? (
            <>
              <img
                src={currentImageUrl}
                alt={`${updatedProduct.name} - תמונה ${currentImageIndex + 1}`}
                className={styles.productImage}
                loading="lazy"
              />


              {productImages.length > 1 && (
                <>
                  <Icon
                    name="ChevronLeftCircle"
                    size={30}
                    className={`${styles.imageNavButton} ${styles.prevButton}`}
                    onClick={prevImage}
                    aria-label="תמונה קודמת"
                  />
                  <Icon
                    name="ChevronRightCircle"
                    size={30}
                    className={`${styles.imageNavButton} ${styles.nextButton}`}
                    onClick={nextImage}
                    aria-label="תמונה הבאה"
                  />

                  <div className={styles.imageIndicators}>
                    {productImages.map((_, index) => (
                      <Button
                          key={index}
                          variant="ghost"
                          size="xs"
                          className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                          }}
                          aria-label={`עבור לתמונה ${index + 1}`}
                        />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.noImage}>
              <svg width={64} height={64} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>אין תמונה</span>
            </div>
          )}

          {product.pricing?.hasDiscount && (
            <div className={styles.saleTag}>-{product.pricing.discountPercentage}%</div>
          )}
        </div>

        {/* אזור תוכן */}
        <div className={styles.content}>
          {/* שם המוצר */}
          <Typography variant="h6" className={styles.productName}>
            {updatedProduct.name}
          </Typography>

          {/* שם משני אופציונלי - מוצג מתחת לשם הראשי בצבע בהיר יותר */}
          {updatedProduct.subtitle && (
            <Typography variant="body2" className={styles.productSubtitle}>
              {updatedProduct.subtitle}
            </Typography>
          )}

          {/* <div>
            {product.description && (
              <Typography variant="body2" className={styles.description}>
                {product.description}
              </Typography>
            )}
          </div> */}

          {/* בחירת SKU - תמיד אם יש SKUs */}
          {product.skus && product.skus.length > 0 && (
            <div className={styles.variantSelector} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <VariantSelector
                skus={product.skus}
                selectedSku={selectedSku}
                onSkuChange={handleSkuChange}
                compactMode={true}
                secondaryVariantAttribute={product.secondaryVariantAttribute}
                hideSecondaryVariants={true}
              />
            </div>
          )}

          <div className={styles.footer}>
            <div className={styles.footerRow}>
              <div className={styles.priceContainer}>
                {selectedSkuPricing ? (
                  <ProductPrice 
                    pricing={selectedSkuPricing} 
                    size="medium" 
                  />
                ) : (
                  <Typography variant="h6" className={styles.price}>
                    ₪{selectedSkuData?.price ?? updatedProduct.price ?? updatedProduct.basePrice}
                  </Typography>
                )}
              </div>

              <div className={styles.actionContainer}>
                {isInStock ? (
                  <AddToCartPopover
                    availableStock={effectiveStock}
                    onAddToCart={(quantity, sku) => {
                      // מעביר את הכמות וה-SKU שנבחרו בפופאובר
                      if (onAddToCart) {
                        onAddToCart(product, sku || selectedSku || undefined, quantity);
                      }
                    }}
                    productName={updatedProduct.name}
                    skus={product.skus}
                    selectedSku={selectedSku}
                    onSkuChange={handleSkuChange}
                    secondaryVariantAttribute={product.secondaryVariantAttribute}
                  >
                    <Button 
                      variant="primary" 
                      size="sm" 
                      mobileFull
                    >
                      הוסף לסל
                    </Button>
                  </AddToCartPopover>
                ) : (
                  /* מוצר אזל - הצגת כפתור התראת מלאי (וריאנט link לכרטיס) */
                  <StockAlertButton
                    productId={productId}
                    productName={product.name}
                    skuCode={selectedSku || undefined}
                    userEmail={userEmail}
                    variant="link"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
 };
 
 // ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
 export default ProductCard;
