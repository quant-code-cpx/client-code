import { it, expect, describe } from 'vitest';

import { paramsHash } from '../params-hash';

describe('paramsHash', () => {
  it('returns "0" for null/undefined', () => {
    expect(paramsHash(null)).toBe('0');
    expect(paramsHash(undefined)).toBe('0');
  });

  it('produces same hash regardless of key order', () => {
    expect(paramsHash({ a: 1, b: 2 })).toBe(paramsHash({ b: 2, a: 1 }));
  });

  it('treats null/undefined/empty values as absent', () => {
    expect(paramsHash({ a: 1, b: null, c: undefined, d: '' })).toBe(paramsHash({ a: 1 }));
  });

  it('different content produces different hash', () => {
    expect(paramsHash({ a: 1 })).not.toBe(paramsHash({ a: 2 }));
  });

  it('handles nested objects', () => {
    expect(paramsHash({ a: { x: 1, y: 2 } })).toBe(paramsHash({ a: { y: 2, x: 1 } }));
  });
});
