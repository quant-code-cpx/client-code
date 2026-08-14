import { getAShareReturnColor, getAShareReturnTextColor } from '../market-color';

describe('A 股涨跌色', () => {
  it('上涨用红色、下跌用绿色，零值与缺失保持中性', () => {
    expect(getAShareReturnColor(0.1, 'default')).toBe('error');
    expect(getAShareReturnColor(-0.1, 'default')).toBe('success');
    expect(getAShareReturnColor(0, 'default')).toBe('default');
    expect(getAShareReturnColor(null, 'inherit')).toBe('inherit');
    expect(getAShareReturnTextColor(0.1)).toBe('error.main');
    expect(getAShareReturnTextColor(-0.1)).toBe('success.main');
  });
});
