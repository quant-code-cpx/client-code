import { it, vi, expect, describe, beforeEach } from 'vitest';

import {
  factorApi,
  famaMacBeth,
  adminJobList,
  adminAuditLog,
  adminBackfill,
  adminJobDetail,
  adminPrecompute,
  adminScheduleInfo,
  createCustomFactor,
  deleteCustomFactor,
  updateCustomFactor,
  getFactorAttribution,
  orthogonalizeFactors,
  saveFactorAsStrategy,
  submitFactorBacktest,
  testCustomExpression,
  batchPrecomputeFactors,
  precomputeCustomFactor,
  optimizeFactorPortfolio,
} from '../factor';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

describe('factorApi.detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards AbortSignal so route changes can cancel the request', async () => {
    const controller = new AbortController();
    mockPost().mockResolvedValueOnce({});

    await factorApi.detail('momentum_20d', controller.signal);

    expect(mockPost()).toHaveBeenCalledWith(
      '/api/factor/detail',
      { factorName: 'momentum_20d' },
      controller.signal
    );
  });
});

describe('factor analysis API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the required tradeDate when precomputing a custom factor', async () => {
    mockPost().mockResolvedValueOnce({});

    await precomputeCustomFactor({ name: 'custom_momentum', tradeDate: '20260810' });

    expect(mockPost()).toHaveBeenCalledWith('/api/factor/custom/precompute', {
      name: 'custom_momentum',
      tradeDate: '20260810',
    });
  });

  it('maps the attribution run identifier to the backend id field', async () => {
    mockPost().mockResolvedValueOnce({});

    await getFactorAttribution({ id: 'run-1' });

    expect(mockPost()).toHaveBeenCalledWith('/api/factor/backtest/attribution', { id: 'run-1' });
  });

  it('routes every factor-library and analysis operation through POST with its body intact', async () => {
    mockPost().mockResolvedValue({});

    await factorApi.library();
    await factorApi.values({ factorName: 'momentum', tradeDate: '20260812' });
    await factorApi.ic({ factorName: 'momentum', startDate: '20260101', endDate: '20260812' });
    await factorApi.quantile({
      factorName: 'momentum',
      startDate: '20260101',
      endDate: '20260812',
    });
    await factorApi.decay({
      factorName: 'momentum',
      startDate: '20260101',
      endDate: '20260812',
    });
    await factorApi.distribution({ factorName: 'momentum', tradeDate: '20260812' });
    await factorApi.correlation({ factorNames: ['momentum', 'value'], tradeDate: '20260812' });
    await factorApi.screening({
      conditions: [{ factorName: 'momentum', operator: 'gt', value: 0 }],
      tradeDate: '20260812',
    });

    expect(mockPost().mock.calls).toEqual([
      ['/api/factor/library', {}],
      ['/api/factor/values', { factorName: 'momentum', tradeDate: '20260812' }],
      [
        '/api/factor/analysis/ic',
        { factorName: 'momentum', startDate: '20260101', endDate: '20260812' },
      ],
      [
        '/api/factor/analysis/quantile',
        { factorName: 'momentum', startDate: '20260101', endDate: '20260812' },
      ],
      [
        '/api/factor/analysis/decay',
        { factorName: 'momentum', startDate: '20260101', endDate: '20260812' },
      ],
      ['/api/factor/analysis/distribution', { factorName: 'momentum', tradeDate: '20260812' }],
      [
        '/api/factor/analysis/correlation',
        { factorNames: ['momentum', 'value'], tradeDate: '20260812' },
      ],
      [
        '/api/factor/screening',
        {
          conditions: [{ factorName: 'momentum', operator: 'gt', value: 0 }],
          tradeDate: '20260812',
        },
      ],
    ]);
  });

  it('keeps workflow, custom-factor, advanced-analysis and admin POST contracts stable', async () => {
    mockPost().mockResolvedValue({});

    const calls: Array<[() => Promise<unknown>, string, object]> = [
      [
        () =>
          saveFactorAsStrategy({
            name: '动量策略',
            conditions: [{ factorName: 'momentum', operator: 'gt', value: 0 }],
          }),
        '/api/factor/backtest/save-as-strategy',
        {
          name: '动量策略',
          conditions: [{ factorName: 'momentum', operator: 'gt', value: 0 }],
        },
      ],
      [
        () => optimizeFactorPortfolio({ tsCodes: ['600000.SH', '000001.SZ'], mode: 'MVO' }),
        '/api/factor/optimization',
        { tsCodes: ['600000.SH', '000001.SZ'], mode: 'MVO' },
      ],
      [
        () =>
          createCustomFactor({
            name: 'custom_alpha',
            label: '自定义 Alpha',
            category: 'CUSTOM',
            expression: 'close / lag(close, 20) - 1',
          }),
        '/api/factor/custom/create',
        {
          name: 'custom_alpha',
          label: '自定义 Alpha',
          category: 'CUSTOM',
          expression: 'close / lag(close, 20) - 1',
        },
      ],
      [
        () => testCustomExpression({ expression: 'close', tradeDate: '20260812' }),
        '/api/factor/custom/test',
        { expression: 'close', tradeDate: '20260812' },
      ],
      [
        () => updateCustomFactor({ name: 'custom_alpha', isEnabled: false }),
        '/api/factor/custom/update',
        { name: 'custom_alpha', isEnabled: false },
      ],
      [
        () => deleteCustomFactor({ name: 'custom_alpha' }),
        '/api/factor/custom/delete',
        { name: 'custom_alpha' },
      ],
      [
        () => submitFactorBacktest({ conditions: [], startDate: '20260101', endDate: '20260812' }),
        '/api/factor/backtest/submit',
        { conditions: [], startDate: '20260101', endDate: '20260812' },
      ],
      [
        () => orthogonalizeFactors({ factorNames: ['momentum', 'value'], tradeDate: '20260812' }),
        '/api/factor/analysis/orthogonalize',
        { factorNames: ['momentum', 'value'], tradeDate: '20260812' },
      ],
      [
        () =>
          famaMacBeth({
            factorNames: ['momentum'],
            startDate: '20260101',
            endDate: '20260812',
          }),
        '/api/factor/analysis/fama-macbeth',
        { factorNames: ['momentum'], startDate: '20260101', endDate: '20260812' },
      ],
      [
        () => adminPrecompute({ factorNames: ['momentum'], tradeDate: '20260812' }),
        '/api/factor/admin/precompute',
        { factorNames: ['momentum'], tradeDate: '20260812' },
      ],
      [
        () =>
          adminBackfill({
            factorNames: ['momentum'],
            startDate: '20260101',
            endDate: '20260812',
          }),
        '/api/factor/admin/backfill',
        { factorNames: ['momentum'], startDate: '20260101', endDate: '20260812' },
      ],
      [() => adminJobList({ page: 1, pageSize: 20 }), '/api/factor/admin/jobs', { page: 1, pageSize: 20 }],
      [
        () => adminJobDetail({ tradeDate: '20260812' }),
        '/api/factor/admin/jobs/detail',
        { tradeDate: '20260812' },
      ],
      [
        () => adminAuditLog({ page: 1, pageSize: 20, action: 'PRECOMPUTE' }),
        '/api/factor/admin/audit',
        { page: 1, pageSize: 20, action: 'PRECOMPUTE' },
      ],
      [() => adminScheduleInfo(), '/api/factor/admin/schedule', {}],
      [
        () => batchPrecomputeFactors({ factorNames: ['momentum'], tradeDate: '20260812' }),
        '/api/factor/admin/precompute-batch',
        { factorNames: ['momentum'], tradeDate: '20260812' },
      ],
    ];

    for (const [invoke, path, body] of calls) {
      mockPost().mockClear();
      await invoke();
      expect(mockPost()).toHaveBeenCalledWith(path, body);
    }
  });
});
