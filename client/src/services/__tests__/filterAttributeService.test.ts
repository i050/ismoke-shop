import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterAttributeService } from '../filterAttributeService';

vi.mock('../../utils/tokenUtils', () => ({
  getToken: () => 'test-token',
}));

const successfulResponse = (data: unknown): Response => ({
  ok: true,
  json: vi.fn().mockResolvedValue({ success: true, message: '', data }),
} as unknown as Response);

const failedResponse = (status: number, message: string): Response => ({
  ok: false,
  status,
  statusText: message,
  json: vi.fn().mockResolvedValue({ success: false, message }),
} as unknown as Response);

describe('FilterAttributeService.getColorFamiliesForAdmin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves the shades returned by the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successfulResponse([
      {
        family: 'blue',
        displayName: 'כחול',
        representativeHex: '#0000FF',
        variants: [{ name: 'כחול ים', hex: '#0066CC' }],
      },
    ])));

    const families = await FilterAttributeService.getColorFamiliesForAdmin();

    expect(families[0]?.variants).toEqual([{ name: 'כחול ים', hex: '#0066CC' }]);
  });

  it('normalizes a legacy response that does not include shades', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successfulResponse([
      {
        family: 'red',
        displayName: 'אדום',
        representativeHex: '#FF0000',
      },
    ])));

    const families = await FilterAttributeService.getColorFamiliesForAdmin();

    expect(families[0]?.variants).toEqual([]);
  });
});

describe('FilterAttributeService.addColorVariant', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the shade to the protected family endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse(undefined));
    vi.stubGlobal('fetch', fetchMock);

    await FilterAttributeService.addColorVariant('light blue', 'תכלת עננים', '#4A90E2');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/color-families/light%20blue/variants'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({ name: 'תכלת עננים', hex: '#4A90E2' }),
      })
    );
  });

  it('surfaces a duplicate-name conflict without treating it as success', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      failedResponse(409, 'גוון "תכלת עננים" כבר קיים במשפחה')
    ));

    await expect(
      FilterAttributeService.addColorVariant('blue', 'תכלת עננים', '#4A90E2')
    ).rejects.toMatchObject({
      status: 409,
      message: 'גוון "תכלת עננים" כבר קיים במשפחה',
    });

    consoleError.mockRestore();
  });
});
