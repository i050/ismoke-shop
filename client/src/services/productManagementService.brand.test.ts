import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductFormData } from '@/schemas/productFormSchema';
import productManagementService from './productManagementService';

const productData = (skus: ProductFormData['skus'] = []): ProductFormData => ({
  name: 'Test product',
  description: '',
  brand: '',
  basePrice: 10,
  categoryId: '507f1f77bcf86cd799439011',
  images: [],
  skus,
} as ProductFormData);

describe('productManagementService brand updates', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps an explicit brand clear in a simple-product request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ _id: 'product-1', name: 'Test product' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
    vi.stubGlobal('fetch', fetchMock);

    await productManagementService.updateProduct('product-1', productData());

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/products\/product-1$/);
    expect(JSON.parse(request.body as string)).toMatchObject({ brand: '' });
  });

  it('keeps an explicit brand clear in a with-skus request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        success: true,
        data: { product: { _id: 'product-1', name: 'Test product' }, skus: [] },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
    vi.stubGlobal('fetch', fetchMock);

    await productManagementService.updateProduct('product-1', productData([{
      sku: 'SKU-1',
      name: 'Variant',
      price: null,
      stockQuantity: 1,
      images: [],
    } as ProductFormData['skus'][number]]));

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/products\/product-1\/with-skus$/);
    expect(JSON.parse(request.body as string)).toMatchObject({
      product: { brand: '' },
    });
  });
});
