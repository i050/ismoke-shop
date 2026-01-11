/**
 * ColorGroupedView Module Exports
 * ================================
 * ייצוא כל הקומפוננטות והטייפים מהמודול
 */

// Main component
export { default as ColorGroupedView } from './ColorGroupedView';
export { default } from './ColorGroupedView';

// Sub-components
export { default as ColorPanel } from './ColorPanel';
export { default as SizeRow } from './SizeRow';
export { default as AddColorModal } from './AddColorModal';
export { default as AddVariantDialog } from './AddVariantDialog';
export { default as EditColorHexModal } from './EditColorHexModal'; // 🆕 מודאל עריכת צבע תצוגה

// Types
export type { NewColorData } from './AddColorModal';
