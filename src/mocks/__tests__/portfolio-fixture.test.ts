import portfolioData from '../data/portfolio.json';

describe('portfolio demo fixture', () => {
  it('所有生产可达组合接口都返回可消费数据，不包含抓取时的原始服务端错误', () => {
    const serialized = JSON.stringify(portfolioData);

    expect(serialized).not.toContain('__error');
    expect(serialized).not.toContain('prisma');
    expect(portfolioData.detail.code).toBe(0);
    expect(portfolioData.detail.data.portfolio.id).toBe('demo-portfolio-1');
    expect(portfolioData.pnlHistory.data.length).toBeGreaterThan(0);
    expect(portfolioData.riskIndustry.data.industries.length).toBeGreaterThan(0);
  });
});
