import { formatYuanAmount } from '../format-yuan-amount';

describe('formatYuanAmount', () => {
  it('formats raw backend yuan values without treating them as ten-thousand yuan', () => {
    expect(formatYuanAmount(null)).toBe('-');
    expect(formatYuanAmount(1200)).toBe('1200.00元');
    expect(formatYuanAmount(120000)).toBe('12.00万');
    expect(formatYuanAmount(120000000)).toBe('1.20亿');
    expect(formatYuanAmount(-20000)).toBe('-2.00万');
  });
});
