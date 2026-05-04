import type { Report } from 'src/api/report';

import { it, expect, describe } from 'vitest';

import { reportToMarkdown } from '../to-markdown';

const baseReport: Report = {
  id: 'r1',
  userId: 1,
  type: 'BACKTEST',
  title: 'Demo backtest',
  params: {},
  data: {
    strategy: { name: 'Strategy A', description: '动量', params: {} },
    metrics: {
      totalReturn: 0.12,
      annualReturn: 0.15,
      sharpe: 1.5,
      maxDrawdown: -0.1,
      winRate: 0.55,
      profitLossRatio: 1.8,
      tradeCount: 42,
      calmarRatio: null,
      sortinoRatio: null,
    },
    navCurve: [],
    drawdownCurve: [],
    monthlyReturns: [],
    trades: [],
    endPositions: [],
  } as unknown as Record<string, unknown>,
  filePath: null,
  format: 'JSON',
  status: 'COMPLETED',
  errorMessage: null,
  fileSize: null,
  createdAt: '2026-04-30T10:00:00Z',
  completedAt: '2026-04-30T10:00:08Z',
};

describe('reportToMarkdown', () => {
  it('includes title and type label', () => {
    const md = reportToMarkdown(baseReport);
    expect(md).toContain('# Demo backtest');
    expect(md).toContain('回测报告');
  });

  it('includes notes when present', () => {
    const md = reportToMarkdown({ ...baseReport, notes: '关键结论：α 显著为正。' });
    expect(md).toContain('## 我的批注');
    expect(md).toContain('α');
  });

  it('handles null data with file fallback hint', () => {
    const md = reportToMarkdown({ ...baseReport, data: null });
    expect(md).toContain('文件格式');
  });

  it('renders backtest metric table', () => {
    const md = reportToMarkdown(baseReport);
    expect(md).toContain('总收益率');
    expect(md).toContain('12.00%');
  });
});
