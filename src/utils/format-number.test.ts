import { fWanYi, fNumber, fPctChg, fPercent, fWanYuan, fCurrency, fQianYuan, fRatePercent, fShortenNumber } from './format-number';

// ----------------------------------------------------------------------

describe('format-number', () => {
  // ---------- fNumber ----------
  describe('fNumber', () => {
    it('formats integer with comma separators', () => {
      expect(fNumber(1234567)).toBe('1,234,567');
    });

    it('formats decimal with max 2 fraction digits', () => {
      expect(fNumber(1234.567)).toBe('1,234.57');
    });

    it('returns empty string for null / undefined / NaN', () => {
      expect(fNumber(null)).toBe('');
      expect(fNumber(undefined)).toBe('');
      expect(fNumber(NaN)).toBe('');
    });

    it('formats string input', () => {
      expect(fNumber('9999')).toBe('9,999');
    });
  });

  // ---------- fCurrency ----------
  describe('fCurrency', () => {
    it('formats as USD currency', () => {
      expect(fCurrency(9999)).toBe('$9,999');
    });

    it('returns empty string for null', () => {
      expect(fCurrency(null)).toBe('');
    });
  });

  // ---------- fPercent ----------
  describe('fPercent', () => {
    it('formats 85 as 85%', () => {
      expect(fPercent(85)).toBe('85%');
    });

    it('formats 0.5 as 0.5%', () => {
      expect(fPercent(0.5)).toBe('0.5%');
    });

    it('returns empty string for null', () => {
      expect(fPercent(null)).toBe('');
    });
  });

  // ---------- fShortenNumber ----------
  describe('fShortenNumber', () => {
    it('shortens million', () => {
      expect(fShortenNumber(1234567)).toMatch(/1\.23m/i);
    });

    it('shortens thousand', () => {
      expect(fShortenNumber(1500)).toMatch(/1\.5k/i);
    });

    it('returns empty string for null', () => {
      expect(fShortenNumber(null)).toBe('');
    });
  });

  // ---------- fWanYuan ----------
  describe('fWanYuan', () => {
    it('formats value >= 10000万 as 亿', () => {
      expect(fWanYuan(50000)).toBe('5.00亿');
    });

    it('formats value < 10000万 as 万', () => {
      expect(fWanYuan(1234.5)).toBe('1234.50万');
    });

    it('returns - for null', () => {
      expect(fWanYuan(null)).toBe('-');
    });

    it('supports custom decimals', () => {
      expect(fWanYuan(50000, 1)).toBe('5.0亿');
    });

    it('handles negative values', () => {
      expect(fWanYuan(-50000)).toBe('-5.00亿');
      expect(fWanYuan(-100)).toBe('-100.00万');
    });
  });

  // ---------- fQianYuan ----------
  describe('fQianYuan', () => {
    it('formats >= 100000千元 as 亿', () => {
      expect(fQianYuan(200000)).toBe('2.00亿');
    });

    it('formats < 100000千元 as 万', () => {
      expect(fQianYuan(500)).toBe('50.00万');
    });

    it('returns - for null', () => {
      expect(fQianYuan(null)).toBe('-');
    });
  });

  // ---------- fWanYi ----------
  describe('fWanYi', () => {
    it('formats >= 1亿 as 亿', () => {
      expect(fWanYi(200000000)).toBe('2.00亿');
    });

    it('formats < 1亿 as 万', () => {
      expect(fWanYi(50000)).toBe('5.00万');
    });

    it('appends suffix', () => {
      expect(fWanYi(200000000, '手')).toBe('2.00亿手');
      expect(fWanYi(50000, '股')).toBe('5.00万股');
    });

    it('returns - for null', () => {
      expect(fWanYi(null)).toBe('-');
    });
  });

  // ---------- fPctChg ----------
  describe('fPctChg', () => {
    it('adds + prefix for positive values', () => {
      expect(fPctChg(1.85)).toBe('+1.85%');
    });

    it('adds - prefix for negative values', () => {
      expect(fPctChg(-2.3)).toBe('-2.30%');
    });

    it('no + prefix for zero', () => {
      expect(fPctChg(0)).toBe('0.00%');
    });

    it('returns - for null', () => {
      expect(fPctChg(null)).toBe('-');
    });
  });

  // ---------- fRatePercent ----------
  describe('fRatePercent', () => {
    it('formats rate with %', () => {
      expect(fRatePercent(0.23)).toBe('0.23%');
    });

    it('returns - for null', () => {
      expect(fRatePercent(null)).toBe('-');
    });
  });
});
