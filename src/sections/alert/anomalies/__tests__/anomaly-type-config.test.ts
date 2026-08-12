import { getAnomalyTypeConfig } from '../anomaly-type-config';

describe('异动类型展示口径', () => {
  it('VOLUME_SURGE 使用不暗示涨跌方向的名称和图标', () => {
    const config = getAnomalyTypeConfig('VOLUME_SURGE');

    expect(config).toMatchObject({
      label: '放量异动',
      shortLabel: '放量',
      icon: 'solar:chart-bold',
      ruleDesc: '当日成交量 / 近 20 日均量 ≥ 3.0 倍（剔除停牌、数据不足 5 日的样本）',
    });
  });
});
