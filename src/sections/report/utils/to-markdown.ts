import type {
  Report,
  ReportType,
  StockReportData,
  BacktestReportData,
  PortfolioReportData,
  StrategyResearchReportData,
} from 'src/api/report';

import { REPORT_TYPE_LABELS } from '../constants';

// ─── Markdown export helpers ───────────────────────────────────────────────

const fmt = (v: number | null | undefined, digits = 2): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(digits);

const pct = (v: number | null | undefined, digits = 2): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`;

function tableRow(cells: (string | number)[]): string {
  return `| ${cells.map((c) => String(c)).join(' | ')} |`;
}
function tableSep(n: number): string {
  return `| ${Array(n).fill('---').join(' | ')} |`;
}

function backtestToMarkdown(data: BacktestReportData): string {
  const m = data.metrics;
  const lines: string[] = [];
  lines.push(`### 策略：${data.strategy.name}`);
  if (data.strategy.description) lines.push(`> ${data.strategy.description}`);
  lines.push('');
  lines.push('### 核心指标');
  lines.push(tableRow(['指标', '值']));
  lines.push(tableSep(2));
  lines.push(tableRow(['总收益率', pct(m.totalReturn)]));
  lines.push(tableRow(['年化收益率', pct(m.annualReturn)]));
  lines.push(tableRow(['夏普比率', fmt(m.sharpe)]));
  lines.push(tableRow(['最大回撤', pct(m.maxDrawdown)]));
  lines.push(tableRow(['胜率', pct(m.winRate)]));
  lines.push(tableRow(['盈亏比', fmt(m.profitLossRatio)]));
  lines.push(tableRow(['交易次数', m.tradeCount]));
  if (m.benchmarkReturn !== undefined && m.benchmarkReturn !== null) {
    lines.push(tableRow(['基准收益率', pct(m.benchmarkReturn)]));
  }
  if (m.alpha !== undefined && m.alpha !== null) lines.push(tableRow(['Alpha', pct(m.alpha)]));
  if (m.beta !== undefined && m.beta !== null) lines.push(tableRow(['Beta', fmt(m.beta)]));
  if (m.volatility !== undefined && m.volatility !== null) {
    lines.push(tableRow(['年化波动率', pct(m.volatility)]));
  }
  if (m.informationRatio !== undefined && m.informationRatio !== null) {
    lines.push(tableRow(['信息比率', fmt(m.informationRatio)]));
  }
  if (m.turnover !== undefined && m.turnover !== null) {
    lines.push(tableRow(['换手率', pct(m.turnover)]));
  }
  if (m.hhi !== undefined && m.hhi !== null) {
    lines.push(tableRow(['持仓集中度 HHI', fmt(m.hhi, 4)]));
  }
  lines.push('');
  if (data.trades.length > 0) {
    lines.push(`### 交易明细（共 ${data.trades.length} 条，仅展示前 50）`);
    lines.push(tableRow(['日期', '代码', '方向', '价格', '数量', '盈亏']));
    lines.push(tableSep(6));
    data.trades.slice(0, 50).forEach((t) => {
      lines.push(
        tableRow([
          t.date,
          t.tsCode,
          t.direction === 'BUY' ? '买入' : '卖出',
          fmt(t.price),
          t.quantity,
          t.pnl ?? '—',
        ])
      );
    });
    lines.push('');
  }
  if (data.endPositions.length > 0) {
    lines.push('### 期末持仓');
    lines.push(tableRow(['代码', '名称', '数量', '成本价', '市值', '权重']));
    lines.push(tableSep(6));
    data.endPositions.forEach((p) => {
      lines.push(
        tableRow([
          p.tsCode,
          p.name ?? '—',
          p.quantity,
          fmt(p.avgCost),
          fmt(p.marketValue, 0),
          pct(p.weight),
        ])
      );
    });
    lines.push('');
  }
  return lines.join('\n');
}

function stockToMarkdown(data: StockReportData): string {
  const o = data.overview;
  const lines: string[] = [];
  lines.push(`### ${o.name}（${o.tsCode}）`);
  lines.push(`- 行业：${o.industry ?? '—'}`);
  lines.push(`- 市场：${o.market ?? '—'}`);
  lines.push(`- 上市日期：${o.listDate ?? '—'}`);
  lines.push(`- 总市值：${fmt(o.totalMv, 0)}`);
  lines.push('');
  if (data.financialSummary.length > 0) {
    lines.push('### 财务摘要');
    lines.push(tableRow(['报告期', '营收', '净利润', 'ROE', 'EPS']));
    lines.push(tableSep(5));
    data.financialSummary.slice(0, 12).forEach((f) => {
      lines.push(
        tableRow([f.period, f.revenue ?? '—', f.netProfit ?? '—', pct(f.roe), fmt(f.eps)])
      );
    });
    lines.push('');
  }
  return lines.join('\n');
}

function portfolioToMarkdown(data: PortfolioReportData): string {
  const o = data.overview;
  const lines: string[] = [];
  lines.push(`### ${o.name}`);
  if (o.description) lines.push(`> ${o.description}`);
  lines.push(`- 初始资金：${fmt(o.initialCash, 0)}`);
  lines.push(`- 总市值：${fmt(o.totalMarketValue, 0)}`);
  lines.push(`- 总成本：${fmt(o.totalCost, 0)}`);
  lines.push(`- 浮盈亏：${fmt(o.unrealizedPnl, 0)}`);
  lines.push(`- 持仓数量：${o.holdingCount}`);
  lines.push('');
  if (data.holdings.length > 0) {
    lines.push('### 持仓');
    lines.push(tableRow(['代码', '名称', '数量', '现价', '市值', '盈亏%', '权重']));
    lines.push(tableSep(7));
    data.holdings.forEach((h) => {
      lines.push(
        tableRow([
          h.tsCode,
          h.name,
          h.quantity,
          fmt(h.currentPrice),
          fmt(h.marketValue, 0),
          pct(h.pnlPct),
          pct(h.weight),
        ])
      );
    });
    lines.push('');
  }
  return lines.join('\n');
}

function strategyToMarkdown(data: StrategyResearchReportData): string {
  const lines: string[] = [];
  lines.push(`### ${data.title}`);
  lines.push(`> 生成时间：${data.generatedAt}`);
  lines.push('');
  const o = data.sections.overview;
  lines.push('### 策略概览');
  lines.push(`- 名称：${o.strategyName}`);
  lines.push(`- 回测区间：${o.backtestPeriod}`);
  lines.push(`- 基准：${o.benchmark ?? '—'}`);
  if (o.description) lines.push(`- 描述：${o.description}`);
  lines.push('');
  if (data.sections.backtestPerformance) {
    const p = data.sections.backtestPerformance;
    lines.push('### 回测表现');
    lines.push(tableRow(['指标', '值']));
    lines.push(tableSep(2));
    lines.push(tableRow(['总收益率', pct(p.totalReturn)]));
    lines.push(tableRow(['年化收益率', pct(p.annualReturn)]));
    lines.push(tableRow(['夏普', fmt(p.sharpe)]));
    lines.push(tableRow(['最大回撤', pct(p.maxDrawdown)]));
    lines.push(tableRow(['胜率', pct(p.winRate)]));
    lines.push(tableRow(['交易次数', p.tradeCount]));
    lines.push('');
  }
  return lines.join('\n');
}

export function reportToMarkdown(report: Report): string {
  const head: string[] = [];
  head.push(`# ${report.title}`);
  head.push('');
  head.push(`- 类型：${REPORT_TYPE_LABELS[report.type] ?? report.type}`);
  head.push(`- 格式：${report.format}`);
  head.push(`- 创建时间：${report.createdAt}`);
  if (report.completedAt) head.push(`- 完成时间：${report.completedAt}`);
  if (report.notes) {
    head.push('');
    head.push('## 我的批注');
    head.push(report.notes);
  }
  head.push('');

  if (!report.data) {
    head.push('> 此报告为文件格式，详情请参考下载件。');
    return head.join('\n');
  }

  let body = '';
  switch (report.type as ReportType) {
    case 'BACKTEST':
      body = backtestToMarkdown(report.data as unknown as BacktestReportData);
      break;
    case 'STOCK':
      body = stockToMarkdown(report.data as unknown as StockReportData);
      break;
    case 'PORTFOLIO':
      body = portfolioToMarkdown(report.data as unknown as PortfolioReportData);
      break;
    case 'STRATEGY_RESEARCH':
      body = strategyToMarkdown(report.data as unknown as StrategyResearchReportData);
      break;
    default:
      body = '_暂不支持此类型的 Markdown 导出。_';
  }

  return [...head, body].join('\n');
}

/** Trigger a browser download of the given Markdown body. */
export function downloadMarkdown(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
