// בדיקות יחידה לפונקציות colorUtils
// מטרה: לוודא שנרמול hex, המרה ל-RGB וחישוב ניגודיות עובדים כצפוי

import { describe, it, expect } from 'vitest';
import { normalizeHex, hexToRgb, relativeLuminance, contrastRatio } from '../colorUtils';

describe('colorUtils', () => {
  describe('normalizeHex', () => {
    it('מנרמל ערכי hex גדולים ל-lowercase', () => {
      expect(normalizeHex('#FFFFFF')).toBe('#ffffff');
      expect(normalizeHex('#ABC123')).toBe('#abc123');
    });

    it('מטפל בערכים מעורבבים של אותיות רישיות וקטנות', () => {
      expect(normalizeHex('#AbC123')).toBe('#abc123');
    });

    it('מרחיב #rgb ל-#rrggbb', () => {
      expect(normalizeHex('#fff')).toBe('#ffffff');
      expect(normalizeHex('#abc')).toBe('#aabbcc');
      expect(normalizeHex('#123')).toBe('#112233');
    });

    it('מחזיר null עבור ערכים לא תקינים', () => {
      expect(normalizeHex('ffffff')).toBeNull(); // חסר #
      expect(normalizeHex('abc123')).toBeNull(); // חסר #
      expect(normalizeHex('#gggggg')).toBeNull(); // תווים לא hex
      expect(normalizeHex('invalid')).toBeNull();
      expect(normalizeHex('')).toBeNull();
      expect(normalizeHex(null as any)).toBeNull();
    });

    it('מנקה רווחים', () => {
      expect(normalizeHex('  #ffffff  ')).toBe('#ffffff');
    });
  });

  describe('hexToRgb', () => {
    it('ממיר hex לאובייקט RGB', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('מטפל בהקסים מעורבים', () => {
      expect(hexToRgb('#abc123')).toEqual({ r: 171, g: 193, b: 35 });
    });

    it('מטפל ב-#rgb (3 תווים) ומרחיב ל-6', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('מחזיר null עבור ערכים לא תקינים', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('ffffff')).toBeNull(); // חסר #
      expect(hexToRgb('')).toBeNull();
    });
  });

  describe('relativeLuminance', () => {
    it('מחשב luminance עבור לבן (תוצאה מקסימלית)', () => {
      const lum = relativeLuminance(255, 255, 255);
      expect(lum).toBeCloseTo(1, 2);
    });

    it('מחשב luminance עבור שחור (תוצאה מינימלית)', () => {
      const lum = relativeLuminance(0, 0, 0);
      expect(lum).toBeCloseTo(0, 2);
    });

    it('מחזיר ערכים סבירים עבור צבעים אמצעיים', () => {
      const lum = relativeLuminance(128, 128, 128);
      expect(lum).toBeGreaterThan(0);
      expect(lum).toBeLessThan(1);
    });
  });

  describe('contrastRatio', () => {
    it('מחשב ניגודיות בין לבן לשחור (מקסימלית)', () => {
      const ratio = contrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 0); // WCAG מקסימום הוא 21:1
    });

    it('מחשב ניגודיות זהה (1:1)', () => {
      const ratio = contrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('מחשב ניגודיות עבור צבעים שונים', () => {
      const ratio = contrastRatio('#0000ff', '#ffff00');
      expect(ratio).toBeGreaterThan(1);
    });

    it('מטפל בערכים לא תקינים בצורה בטיחותית', () => {
      const ratio = contrastRatio('invalid', '#ffffff');
      expect(ratio).toBe(0); // מחזיר 0 כאשר לא ניתן לחשב
    });

    it('מחזיר אותה תוצאה בכל סדר (סימטריה)', () => {
      const ratio1 = contrastRatio('#ff0000', '#00ff00');
      const ratio2 = contrastRatio('#00ff00', '#ff0000');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });

  describe('תרחישי נגישות (AA/AAA)', () => {
    it('לבן על כחול כהה עובר AA', () => {
      const ratio = contrastRatio('#ffffff', '#0000aa');
      expect(ratio).toBeGreaterThanOrEqual(4.5); // AA רגיל
    });

    it('שחור על אפור בהיר עובר AA', () => {
      const ratio = contrastRatio('#000000', '#cccccc');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('צהוב על לבן לא עובר AA (ניגודיות נמוכה)', () => {
      const ratio = contrastRatio('#ffff00', '#ffffff');
      expect(ratio).toBeLessThan(4.5);
    });
  });
});
