import { Route, Routes } from 'react-router';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { KnowledgeBaseView } from '../view/knowledge-base-view';

function renderKnowledgeRoute(initialEntry: string) {
  return renderWithProviders(
    <Routes>
      <Route path="knowledge" element={<KnowledgeBaseView />} />
      <Route path="knowledge/:majorSlug" element={<KnowledgeBaseView />} />
      <Route path="knowledge/:majorSlug/:topicSlug" element={<KnowledgeBaseView />} />
    </Routes>,
    { initialEntries: [initialEntry] }
  );
}

describe('KnowledgeBaseView', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('总览只展示已发布且经过校对的大专题', () => {
    renderKnowledgeRoute('/knowledge');

    expect(screen.getByRole('heading', { level: 1, name: '知识库' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '金钱、个人财务与投资生存线' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '法律合规、职业伦理与账户安全' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(36);
    expect(screen.getAllByText('已发布 12 / 12 个小专题').length).toBeGreaterThan(0);
  });

  it('大专题首页只暴露已经发布的小专题', () => {
    renderKnowledgeRoute('/knowledge/personal-finance');

    expect(
      screen.getByRole('heading', { level: 1, name: '金钱、个人财务与投资生存线' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '钱、收入与财富' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '个人与家庭资产负债表' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '储蓄、投资、投机与赌博' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '应急资金与风险资本' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '债务与个人信用' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '保险与风险转移' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '投资目标与约束' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '复利的朋友与敌人' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '投资骗局与账户安全启蒙' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '预算、储蓄与现金管理' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '生命周期、社会保障与养老准备' })
    ).toBeInTheDocument();
    expect(screen.getByText('12 / 12')).toBeInTheDocument();
  });

  it('01.5 页面渲染 16 个规划知识点和对应专业校对来源', async () => {
    renderKnowledgeRoute('/knowledge/personal-finance/debt-personal-credit');

    expect(await screen.findByRole('heading', { level: 2, name: '消费债务' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '债务与个人信用' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '破产边界' })).toBeInTheDocument();
    expect(screen.getAllByText('信用记录').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole('link', { name: /中国人民银行征信中心：一次性信用修复政策/ })
    ).toHaveAttribute(
      'href',
      'https://www.pbccrc.org.cn/xczl/xyxf/20251222/7c7abc6bf4984eebbc0d1fa23fcab368.html'
    );
  });

  it('01.4 页面渲染 11 个规划知识点和对应专业校对来源', async () => {
    renderKnowledgeRoute('/knowledge/personal-finance/emergency-fund-risk-capital');

    expect(await screen.findByRole('heading', { level: 2, name: '应急资金' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '应急资金与风险资本' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '不借生活费交易' })).toBeInTheDocument();
    expect(screen.getAllByText('不可承受损失').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole('link', { name: /中国证券监督管理委员会：咨询能否参与股票或期货配资业务/ })
    ).toHaveAttribute('href', 'https://www.csrc.gov.cn/csrc/c100210/c1498850/content.shtml');
  });

  it('01.3 页面渲染 11 个规划知识点和对应专业校对来源', async () => {
    renderKnowledgeRoute('/knowledge/personal-finance/saving-investing-speculation-gambling');

    expect(await screen.findByRole('heading', { level: 2, name: '延迟消费' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '储蓄、投资、投机与赌博' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '不可验证下注' })).toBeInTheDocument();
    expect(screen.getAllByText('正期望与负期望').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: /OpenStax：Mean or Expected Value/ })).toHaveAttribute(
      'href',
      'https://openstax.org/books/statistics/pages/4-2-mean-or-expected-value-and-standard-deviation'
    );
  });

  it('01.2 页面渲染 12 个规划知识点和对应专业校对来源', async () => {
    renderKnowledgeRoute('/knowledge/personal-finance/household-balance-sheet');

    expect(await screen.findByRole('heading', { level: 2, name: '流动资产' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '个人与家庭资产负债表' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '家庭财务脆弱性' })).toBeInTheDocument();
    expect(screen.getAllByText('储蓄率').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole('link', {
        name: /Consumer Financial Protection Bureau：What is a debt-to-income ratio/,
      })
    ).toHaveAttribute(
      'href',
      'https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/'
    );
  });

  it('01.1 页面渲染 12 个知识点、页内目录和专业校对来源', async () => {
    renderKnowledgeRoute('/knowledge/personal-finance/money-income-wealth');

    expect(await screen.findByRole('heading', { level: 2, name: '稀缺' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '钱、收入与财富' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '小专题目录' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '本页知识点' })).toBeInTheDocument();
    expect(screen.getAllByText('财富存量与收入流量').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('常见误区：').length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/\*\*(?:先记住一句话|常见误区)/)).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 2, name: '专业校对记录' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /国家统计局：什么是存量与流量/ })).toHaveAttribute(
      'href',
      'https://www.stats.gov.cn/zs/tjws/tjbk/202301/t20230101_1912928.html'
    );
  });

  it('复制当前深链并提供成功反馈', async () => {
    const { user } = renderKnowledgeRoute(
      '/knowledge/personal-finance/money-income-wealth#net-worth'
    );
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');

    await screen.findByRole('heading', { level: 2, name: '净资产' });
    await waitFor(() =>
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    );
    await user.click(screen.getByRole('button', { name: '复制链接' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#net-worth'));
    expect(await screen.findByText('页面链接已复制')).toBeInTheDocument();
  });

  it('无效小专题保留知识库上下文并不展示伪内容', async () => {
    renderKnowledgeRoute('/knowledge/personal-finance/not-published');

    expect(
      screen.getByRole('heading', { level: 1, name: '未找到这个知识页面' })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/尚未完成专业校对和发布/)).toBeInTheDocument();
    });
  });
});
