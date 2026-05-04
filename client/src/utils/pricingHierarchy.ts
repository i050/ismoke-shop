import type { PricingData, Product, Sku } from '../types/Product';

const roundPrice = (price: number): number => Math.round(price * 100) / 100;

const hasSpecificSkuPrice = (sku?: Pick<Sku, 'price'> | null): boolean =>
  sku?.price !== null && sku?.price !== undefined;

const getProductCompareAtPrice = (product: Product): number | undefined =>
  product.pricing?.compareAtPrice ?? product.compareAtPrice;

/**
 * מחשב מחיר תצוגה ל-SKU לפי היררכיית המחירים של המוצר.
 * compareAtPrice הוא תצוגתי בלבד, ולכן הוא לעולם לא משנה את finalPrice.
 */
export const resolveSkuPricing = (
  product: Product,
  selectedSku?: Sku | null
): PricingData | undefined => {
  const productPricing = product.pricing;

  if (!selectedSku) {
    return productPricing ?? {
      productId: product._id,
      originalPrice: product.basePrice,
      finalPrice: product.basePrice,
      discountPercentage: 0,
      hasDiscount: false,
      compareAtPrice: product.compareAtPrice,
    };
  }

  const hasSkuPrice = hasSpecificSkuPrice(selectedSku);
  const realPrice = hasSkuPrice ? selectedSku.price! : product.basePrice;
  const visibleDiscountPercentage = Math.max(productPricing?.discountPercentage ?? 0, 0);

  const hiddenDiscountRatio =
    visibleDiscountPercentage === 0
      && productPricing
      && product.basePrice > 0
      && productPricing.finalPrice < product.basePrice
        ? productPricing.finalPrice / product.basePrice
        : 1;

  const finalPrice = visibleDiscountPercentage > 0
    ? roundPrice(realPrice * (1 - visibleDiscountPercentage / 100))
    : roundPrice(realPrice * hiddenDiscountRatio);

  const compareAtCandidate = (() => {
    if (hasSkuPrice) {
      return selectedSku.compareAtPrice != null && selectedSku.compareAtPrice > realPrice
        ? selectedSku.compareAtPrice
        : undefined;
    }

    // אם לגרסה יש רק מחיר לפני הנחה בלי מחיר אמיתי, לא מציגים אותו וגם לא יורשים compareAt מהמוצר.
    if (selectedSku.compareAtPrice != null) {
      return undefined;
    }

    const inheritedCompareAtPrice = getProductCompareAtPrice(product);
    return inheritedCompareAtPrice != null && inheritedCompareAtPrice > finalPrice
      ? inheritedCompareAtPrice
      : undefined;
  })();

  const originalPrice = compareAtCandidate && compareAtCandidate > finalPrice
    ? compareAtCandidate
    : visibleDiscountPercentage > 0
      ? realPrice
      : finalPrice;

  const hasDiscount = originalPrice > finalPrice;

  return {
    productId: product._id,
    originalPrice,
    finalPrice,
    discountPercentage: visibleDiscountPercentage,
    customerGroupName: visibleDiscountPercentage > 0 ? productPricing?.customerGroupName : undefined,
    hasDiscount,
    compareAtPrice: compareAtCandidate,
  };
};
