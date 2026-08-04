import { it, expect, describe } from 'vitest';

import { resolvePctChgLimit } from '../limit-glossary';

describe('resolvePctChgLimit', () => {
  it('ignores daily percent change mistakenly returned as board height', () => {
    expect(
      resolvePctChgLimit({
        tsCode: '300378.SZ',
        stockName: '鼎捷数智',
        pctChgLimit: 16.84,
      })
    ).toBe(20);
  });

  it('keeps valid explicit board heights', () => {
    expect(
      resolvePctChgLimit({
        tsCode: '600588.SH',
        stockName: '用友网络',
        pctChgLimit: 10,
      })
    ).toBe(10);
  });

  it('falls back to Beijing Exchange board height for invalid response values', () => {
    expect(
      resolvePctChgLimit({
        tsCode: '920130.BJ',
        stockName: '立方控股',
        pctChgLimit: 29.98,
      })
    ).toBe(30);
  });
});
