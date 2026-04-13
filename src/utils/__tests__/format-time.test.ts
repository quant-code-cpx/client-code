import { fDate, fToNow, fDateTime } from '../format-time';

// ----------------------------------------------------------------------

describe('format-time', () => {
  // ---------- fDate ----------
  describe('fDate', () => {
    it('formats date with default template', () => {
      // Default template: "DD MMM YYYY"
      const result = fDate('2024-04-17');
      expect(result).toBe('17 Apr 2024');
    });

    it('formats date with custom template', () => {
      const result = fDate('2024-04-17', 'YYYY-MM-DD');
      expect(result).toBe('2024-04-17');
    });

    it('returns "Invalid date" for null', () => {
      expect(fDate(null)).toBe('Invalid date');
    });

    it('returns "Invalid date" for undefined', () => {
      expect(fDate(undefined)).toBe('Invalid date');
    });

    it('handles ISO 8601 string', () => {
      const result = fDate('2025-01-15T10:30:00.000Z', 'YYYY-MM-DD');
      expect(result).toBe('2025-01-15');
    });

    it('returns "Invalid date" for invalid string input', () => {
      expect(fDate('not-a-date')).toBe('Invalid date');
      expect(fDate('abc123')).toBe('Invalid date');
    });
  });

  // ---------- fDateTime ----------
  describe('fDateTime', () => {
    it('formats datetime with default template', () => {
      const result = fDateTime('2024-04-17T14:30:00');
      // Default template: "DD MMM YYYY h:mm a"
      expect(result).toMatch(/17 Apr 2024/);
    });

    it('formats datetime with custom template', () => {
      const result = fDateTime('2024-04-17T14:30:00', 'YYYY-MM-DD HH:mm');
      expect(result).toBe('2024-04-17 14:30');
    });

    it('returns "Invalid date" for null', () => {
      expect(fDateTime(null)).toBe('Invalid date');
    });
  });

  // ---------- fToNow ----------
  describe('fToNow', () => {
    it('returns relative time string', () => {
      // A date far in the past
      const result = fToNow('2020-01-01');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('Invalid date');
    });

    it('returns "Invalid date" for null', () => {
      expect(fToNow(null)).toBe('Invalid date');
    });
  });
});
