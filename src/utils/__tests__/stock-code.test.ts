import { toSdkCode } from '../stock-code';

// ----------------------------------------------------------------------

describe('toSdkCode', () => {
  it('converts Shenzhen codes', () => {
    expect(toSdkCode('300364.SZ')).toBe('sz300364');
    expect(toSdkCode('000858.SZ')).toBe('sz000858');
  });

  it('converts Shanghai codes', () => {
    expect(toSdkCode('600519.SH')).toBe('sh600519');
    expect(toSdkCode('000001.SH')).toBe('sh000001');
  });

  it('converts Beijing codes', () => {
    expect(toSdkCode('830799.BJ')).toBe('bj830799');
  });

  it('is case-insensitive on the suffix', () => {
    expect(toSdkCode('300364.sz')).toBe('sz300364');
  });

  it('returns null for unknown exchange suffix', () => {
    expect(toSdkCode('AAPL.US')).toBeNull();
    expect(toSdkCode('00700.HK')).toBeNull();
  });

  it('returns null for malformed or empty input', () => {
    expect(toSdkCode('')).toBeNull();
    expect(toSdkCode(null)).toBeNull();
    expect(toSdkCode(undefined)).toBeNull();
    expect(toSdkCode('300364')).toBeNull();
    expect(toSdkCode('abc.SZ')).toBeNull();
  });
});
