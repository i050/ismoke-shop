import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductService } from './productService';

const jsonResponse = (body: unknown): Response => new Response(
  JSON.stringify(body),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);

describe('ProductService product-details cache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ProductService.invalidateProductDetailsCache();
  });

  afterEach(() => {
    ProductService.invalidateProductDetailsCache();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not let an older request overwrite a later force refresh', async () => {
    let resolveOldRequest!: (response: Response) => void;
    let resolveFreshRequest!: (response: Response) => void;
    const oldResponse = new Promise<Response>((resolve) => {
      resolveOldRequest = resolve;
    });
    const freshResponse = new Promise<Response>((resolve) => {
      resolveFreshRequest = resolve;
    });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(oldResponse)
      .mockReturnValueOnce(freshResponse);
    vi.stubGlobal('fetch', fetchMock);

    const oldRequest = ProductService.getProductById('product-1');
    const freshRequest = ProductService.getProductById(
      'product-1',
      undefined,
      { forceRefresh: true }
    );

    resolveFreshRequest(jsonResponse({ _id: 'product-1', brand: 'NEW' }));
    await expect(freshRequest).resolves.toMatchObject({ brand: 'NEW' });

    resolveOldRequest(jsonResponse({ _id: 'product-1', brand: 'OLD' }));
    await expect(oldRequest).resolves.toMatchObject({ brand: 'OLD' });

    await expect(ProductService.getProductById('product-1')).resolves.toMatchObject({
      brand: 'NEW',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
