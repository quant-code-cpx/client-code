// Shared types for the four smart "generate" forms.
// Each form fetches relevant resources (recent backtest runs, portfolios,
// strategies, stock search) and emits a typed `params` payload.

import type { ReportType, ReportFormat } from 'src/api/report';

export type GenerateBacktestParams = {
  runId: string;
};

export type GenerateStockParams = {
  tsCode: string;
};

export type GeneratePortfolioParams = {
  portfolioId: string;
};

export type GenerateStrategyParams = {
  backtestRunId: string;
  strategyId?: string;
  portfolioId?: string;
  sections?: {
    performance?: boolean;
    holdings?: boolean;
    riskAssessment?: boolean;
    tradeLog?: boolean;
    factorExposure?: boolean;
    parameterSensitivity?: boolean;
    rollingStability?: boolean;
  };
};

export type GenerateParams =
  | { type: 'BACKTEST'; params: GenerateBacktestParams }
  | { type: 'STOCK'; params: GenerateStockParams }
  | { type: 'PORTFOLIO'; params: GeneratePortfolioParams }
  | { type: 'STRATEGY_RESEARCH'; params: GenerateStrategyParams };

export type GenerateFormProps<T> = {
  value: T;
  onChange: (next: T) => void;
  /** Allow the form to flag a "ready to submit" state to the parent */
  onValidChange?: (valid: boolean) => void;
};

export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  { value: 'BACKTEST', label: '回测报告', description: '基于已完成的回测运行生成' },
  { value: 'STOCK', label: '个股研报', description: '为指定股票生成快照研究报告' },
  { value: 'PORTFOLIO', label: '组合报告', description: '为指定组合生成持仓与归因' },
  {
    value: 'STRATEGY_RESEARCH',
    label: '策略研究',
    description: '完整策略研究：表现 / 风险 / 持仓',
  },
];

export const REPORT_FORMAT_OPTIONS: { value: ReportFormat; label: string; description: string }[] =
  [
    { value: 'JSON', label: 'JSON', description: '在线交互查看（推荐）' },
    { value: 'HTML', label: 'HTML', description: '可分享的网页文件' },
    { value: 'PDF', label: 'PDF', description: '便于打印 / 归档' },
  ];
