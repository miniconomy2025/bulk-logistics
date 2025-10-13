import { formatAsCurrencyStyle } from '../../utils/format-currency';

describe('format-currency', () => {
  describe('formatAsCurrencyStyle', () => {
    it('should format positive numbers correctly', () => {
      expect(formatAsCurrencyStyle(1234.56)).toBe('1,234.56');
      expect(formatAsCurrencyStyle(1000)).toBe('1,000.00');
      expect(formatAsCurrencyStyle(999.99)).toBe('999.99');
    });

    it('should format negative numbers correctly', () => {
      expect(formatAsCurrencyStyle(-1234.56)).toBe('-1,234.56');
      expect(formatAsCurrencyStyle(-1000)).toBe('-1,000.00');
    });

    it('should handle zero', () => {
      expect(formatAsCurrencyStyle(0)).toBe('0.00');
    });

    it('should handle undefined input', () => {
      expect(formatAsCurrencyStyle(undefined)).toBe('0.00');
    });

    it('should format large numbers with proper comma separation', () => {
      expect(formatAsCurrencyStyle(1234567.89)).toBe('1,234,567.89');
      expect(formatAsCurrencyStyle(1000000)).toBe('1,000,000.00');
    });

    it('should handle decimal precision correctly', () => {
      expect(formatAsCurrencyStyle(123.1)).toBe('123.10');
      expect(formatAsCurrencyStyle(123.123)).toBe('123.12'); // Rounded to 2 decimal places
      expect(formatAsCurrencyStyle(123.125)).toBe('123.13'); // Rounded up
    });

    it('should handle very small numbers', () => {
      expect(formatAsCurrencyStyle(0.01)).toBe('0.01');
      expect(formatAsCurrencyStyle(0.001)).toBe('0.00'); // Rounded to 2 decimal places
    });
  });
});
