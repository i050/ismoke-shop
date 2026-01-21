export { default } from './ProductSKUs';
export { generateSkuFromName, generateNextSkuCode } from './ProductSKUs'; // ייצוא הפונקציות
export { default as SKURow } from './SKURow';
export { default as AddSKUModal } from './AddSKUModal';
export { default as SKUImageManager } from './SKUImageManager';

// 🆕 Inline Variant Flow Components
export { VariantAttributesInline } from './VariantAttributesInline';
export type { SelectedAttribute, VariantAttributesInlineProps } from './VariantAttributesInline';
export { default as CombinationsGrid } from './CombinationsGrid';
export type { Combination, AxisValue, CombinationsGridProps } from './CombinationsGrid';
export { default as AutoFillModal } from './AutoFillModal';
export { AutoFillPanel } from './AutoFillPanel';
export type { AutoFillPanelProps } from './AutoFillPanel';

// 🆕 SKU Grouping Utilities
export {
  groupSkusByColor,
  flattenColorGroups,
  createNewColorGroup,
  addSizeToColorGroup,
  updateSizeInColorGroup,
  removeSizeFromColorGroup,
  fillAllSizesInColorGroup,
} from './utils/skuGrouping';
export type { ColorGroup, ColorSizeEntry } from './utils/skuGrouping';

// ============================================================================
// 🔒 Legacy Components - שמורים לתאימות אחורה אך לא מיוצאים
// ColorGroupedView, CustomVariantsView, VariantWizard - הוחלפו ב-Inline Flow
// ============================================================================

