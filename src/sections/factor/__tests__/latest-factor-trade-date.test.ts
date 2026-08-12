import type { FactorDef } from 'src/api/factor';

import { resolveLatestFactorTradeDate } from '../latest-factor-trade-date';

function factor(latestDate: string | null): FactorDef {
  return {
    id: latestDate ?? 'missing',
    name: `factor_${latestDate ?? 'missing'}`,
    label: '测试因子',
    category: 'CUSTOM',
    sourceType: 'CUSTOM_SQL',
    isBuiltin: false,
    latestDate,
  };
}

describe('resolveLatestFactorTradeDate', () => {
  it('使用后端因子快照中最新的合法交易日', () => {
    expect(
      resolveLatestFactorTradeDate([
        factor('20260806'),
        factor(null),
        factor('20260807'),
        factor('2026-08-10'),
      ])
    ).toBe('20260807');
  });

  it('无合法快照日期时返回 null，不猜测自然日', () => {
    expect(resolveLatestFactorTradeDate([factor(null), factor('2026-08-10')])).toBeNull();
  });
});
