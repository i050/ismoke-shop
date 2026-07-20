import type { Brand } from '@/services/brandService';
import type { Product } from '@/types/Product';

export interface ProductBrandOption {
  key: string;
  value: string;
  label: string;
  disabled: boolean;
}

export const getInitialProductBrand = (
  product?: Pick<Product, 'brand'>
): string | null => product?.brand ?? null;

export const buildBrandSubmissionPatch = (
  brand: string | null | undefined,
  mode: 'create' | 'edit',
  isBrandDirty: boolean
): { brand?: string | null } => {
  if (mode === 'edit' && !isBrandDirty) {
    return {};
  }

  return { brand: brand ?? (mode === 'edit' ? '' : null) };
};

export const buildProductBrandOptions = (
  brands: Brand[],
  currentBrand: string | null
): ProductBrandOption[] => {
  const currentName = currentBrand?.trim() || '';
  const options = brands
    .filter((brand) => brand.isActive || brand.name === currentName)
    .map((brand) => ({
      key: brand._id,
      value: brand.name,
      label: brand.isActive
        ? brand.name
        : `${brand.name} (לא פעיל – משויך כרגע)`,
      disabled: !brand.isActive,
    }));

  if (currentName && !brands.some((brand) => brand.name === currentName)) {
    options.push({
      key: `stored:${currentName}`,
      value: currentName,
      label: `${currentName} (מותג שמור שאינו קיים ברשימה)`,
      disabled: true,
    });
  }

  return options;
};
