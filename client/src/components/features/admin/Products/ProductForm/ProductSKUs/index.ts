export { default } from './ProductSKUs';
export { generateSkuFromName, generateNextSkuCode } from './ProductSKUs'; // ייצוא הפונקציות
export { default as SKURow } from './SKURow';
export { default as AddSKUModal } from './AddSKUModal';
export { default as SKUImageManager } from './SKUImageManager';

// 🆕 Color Grouped View Components
export { ColorGroupedView, ColorPanel, SizeRow, AddColorModal } from './ColorGroupedView';
export type { NewColorData } from './ColorGroupedView';

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
