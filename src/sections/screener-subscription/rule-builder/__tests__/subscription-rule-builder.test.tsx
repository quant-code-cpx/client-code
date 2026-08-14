/** @vitest-environment jsdom */

import type { ScreenerSubscription } from 'src/api/screener-subscription';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import {
  createSubscription,
  getSubscriptionMetrics,
  previewSubscriptionRule,
  validateSubscriptionRule,
} from 'src/api/screener-subscription';

import { createBuilderState } from '../subscription-rule-reducer';
import { SubscriptionRuleBuilder } from '../subscription-rule-builder';

vi.mock('src/api/screener-subscription', () => ({
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getSubscriptionMetrics: vi.fn(),
  previewSubscriptionRule: vi.fn(),
  validateSubscriptionRule: vi.fn(),
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

describe('SubscriptionRuleBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSubscriptionMetrics).mockResolvedValue({
      catalogVersion: 'catalog-v1',
      metrics: [
        {
          id: 'roe',
          filterKey: 'minRoe',
          version: 1,
          source: 'STOCK',
          category: '盈利',
          label: 'ROE',
          description: '净资产收益率',
          valueType: 'PERCENT',
          unit: '%',
          operators: ['GTE'],
          min: 0,
          max: 100,
          precision: 2,
          requiredDataSets: ['fina_indicator'],
          availability: 'ENABLED',
          semanticsVersion: 'v1',
        },
      ],
    });
    vi.mocked(validateSubscriptionRule).mockResolvedValue({ valid: true, hasDuplicate: false });
    vi.mocked(previewSubscriptionRule).mockResolvedValue({
      ruleFingerprint: 'rule-v1',
      catalogVersion: 'catalog-v1',
      asOfTradeDate: '20260813',
      universeCount: 5000,
      matchedCount: 1,
      truncated: false,
      matchedStocks: [{ tsCode: '600519.SH', name: '贵州茅台' }],
      evidence: [],
      warnings: [],
      dataVersions: {},
      executionMs: 12,
    });
    vi.mocked(createSubscription).mockResolvedValue({ id: 9 } as ScreenerSubscription);
  });

  it('使用同一规则完成预览后创建活跃订阅', async () => {
    const onSaved = vi.fn();
    const { user } = renderWithProviders(
      <SubscriptionRuleBuilder
        initialState={createBuilderState({ name: '高 ROE', filters: { minRoe: 12 } })}
        onBack={vi.fn()}
        onSaved={onSaved}
      />
    );

    expect(await screen.findByDisplayValue('12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '运行预览' }));

    expect(await screen.findByText('2026-08-13')).toBeInTheDocument();
    expect(previewSubscriptionRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleSpec: expect.objectContaining({ filters: { minRoe: 12 } }),
        limit: 20,
      })
    );

    await user.click(screen.getByRole('button', { name: '创建订阅' }));

    await waitFor(() => expect(createSubscription).toHaveBeenCalledTimes(1));
    expect(createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '高 ROE',
        status: 'ACTIVE',
        ruleSpec: expect.objectContaining({ filters: { minRoe: 12 } }),
      })
    );
    expect(onSaved).toHaveBeenCalledWith(9);
  });
});
