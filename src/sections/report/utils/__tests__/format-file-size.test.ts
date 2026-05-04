import { it, expect, describe } from 'vitest';

import { formatFileSize } from '../format-file-size';

describe('formatFileSize', () => {
  it('returns dash for null/undefined', () => {
    expect(formatFileSize(null)).toBe('—');
    expect(formatFileSize(undefined)).toBe('—');
  });
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });
  it('formats KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });
  it('formats MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
