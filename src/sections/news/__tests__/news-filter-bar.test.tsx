import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { NewsFilterBar } from '../components/news-filter-bar';

import type { NewsUrlState } from '../news-url-state';

const mocks = vi.hoisted(() => ({ searchStocks: vi.fn() }));

vi.mock('src/api/stock', () => ({
  searchStocks: mocks.searchStocks,
}));

const value: NewsUrlState = {
  scope: 'ALL',
  securityCodes: [],
  keyword: '',
  contentTypes: [],
  sourceTypes: [],
  from: null,
  to: null,
  includeUnknownPublishedTime: false,
  articleId: null,
};

describe('新闻筛选响应式交互', () => {
  beforeEach(() => vi.clearAllMocks());

  it('NEWS-FE-E2E-007：移动端只显示紧凑入口，筛选在 Drawer 内提交并关闭', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    try {
      const onApply = vi.fn();
      const { user } = renderWithProviders(
        <NewsFilterBar value={value} errors={{}} onApply={onApply} onClear={vi.fn()} />
      );

      expect(screen.getByRole('button', { name: '筛选新闻' })).toBeInTheDocument();
      expect(screen.queryByLabelText('搜索标题或摘要')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '筛选新闻' }));
      expect(screen.getByRole('dialog', { name: '新闻筛选' })).toBeInTheDocument();
      await user.type(screen.getByLabelText('搜索标题或摘要'), '半导体');
      await user.click(screen.getByRole('button', { name: '应用筛选' }));

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ keyword: '半导体' }));
      expect(screen.queryByRole('dialog', { name: '新闻筛选' })).not.toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('NEWS-FE-FILTER-005～007：指定证券使用搜索多选，提交合法唯一代码', async () => {
    mocks.searchStocks.mockResolvedValue({
      items: [
        {
          tsCode: '600000.SH',
          symbol: '600000',
          name: '浦发银行',
          market: '主板',
          industry: '银行',
          listStatus: 'L',
        },
      ],
      total: 1,
    });
    const onApply = vi.fn();
    const { user } = renderWithProviders(
      <NewsFilterBar value={value} errors={{}} onApply={onApply} onClear={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: '指定证券' }));
    await user.type(screen.getByLabelText('证券代码'), '浦发');
    expect(await screen.findByRole('option', { name: /浦发银行.*600000.SH/ })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /浦发银行.*600000.SH/ }));
    await user.click(screen.getByRole('button', { name: '应用筛选' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'SECURITIES', securityCodes: ['600000.SH'] })
    );
  });
});
