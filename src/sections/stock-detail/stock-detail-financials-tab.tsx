import type { StockFinancialsData, StockFinancialStatementsData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fPctChg, fNumber, fPercent } from 'src/utils/format-number';

import { stockDetailApi } from 'src/api/stock';

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

type Props = { tsCode: string };

type SubTab = 'ratios' | 'income' | 'balance' | 'cashflow';

/** Format period date (ISO datetime or YYYYMMDD) → YYYY-MM-DD */
function fmtPeriod(d: unknown): string {
  if (!d) return '-';
  const s = String(d);
  if (s.includes('T')) return s.slice(0, 10);
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s.slice(0, 10);
}

/**
 * Format a raw yuan amount into 亿元 / 万元 / 元 scale.
 * Tushare income/balancesheet/cashflow columns are in yuan (元).
 */
function fYuanAmt(value: number | null | undefined): string {
  if (value == null) return '-';
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  if (abs === 0) return '0';
  return value.toFixed(2);
}

function formatValue(value: unknown, format?: 'number' | 'percent'): string {
  if (value == null) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (format === 'percent') return fPercent(num);
  return fNumber(num);
}

// ----------------------------------------------------------------------
// Statement table generic component
// ----------------------------------------------------------------------

type FieldDef = {
  key: string;
  label: string;
  /** Key of the YoY percentage field in the same data object */
  yoyKey?: string;
  /** When true, value is per-share (keep decimals, skip unit scale) */
  isEps?: boolean;
};

type StatementTableProps = {
  periods: Record<string, unknown>[];
  fields: FieldDef[];
  unitNote?: string;
};

function StatementTable({ periods, fields, unitNote = '单位: 元' }: StatementTableProps) {
  if (periods.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">暂无数据</Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 600 }}>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                position: 'sticky',
                left: 0,
                bgcolor: 'background.neutral',
                minWidth: 200,
                color: 'text.disabled',
                fontSize: 11,
              }}
            >
              指标 ({unitNote})
            </TableCell>
            {periods.map((p, i) => (
              <TableCell
                key={i}
                align="right"
                sx={{ minWidth: 130, fontWeight: 'fontWeightSemiBold', whiteSpace: 'nowrap' }}
              >
                {fmtPeriod(p.endDate)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map(({ key, label, yoyKey, isEps }) => (
            <TableRow key={key} hover>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                  fontSize: 12,
                  minWidth: 200,
                }}
              >
                {label}
              </TableCell>
              {periods.map((p, i) => {
                const val = p[key] as number | null | undefined;
                const yoyVal = yoyKey ? (p[yoyKey] as number | null | undefined) : undefined;
                const displayVal = isEps ? (val != null ? val.toFixed(4) : '-') : fYuanAmt(val);

                return (
                  <TableCell key={i} align="right">
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {displayVal}
                    </Typography>
                    {yoyVal != null && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          lineHeight: 1.3,
                          color: yoyVal >= 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        同比 {fPctChg(yoyVal)}
                      </Typography>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ----------------------------------------------------------------------
// Field definitions for each statement
// ----------------------------------------------------------------------

const INCOME_FIELDS: FieldDef[] = [
  { key: 'totalRevenue', label: '营业总收入', yoyKey: 'totalRevenueYoy' },
  { key: 'revenue', label: '  ↳ 营业收入' },
  { key: 'operateProfit', label: '营业利润', yoyKey: 'operateProfitYoy' },
  { key: 'totalProfit', label: '利润总额' },
  { key: 'nIncome', label: '净利润', yoyKey: 'nIncomeYoy' },
  { key: 'nIncomeAttrP', label: '  ↳ 归母净利润' },
  { key: 'sellExp', label: '销售费用' },
  { key: 'adminExp', label: '管理费用' },
  { key: 'finExp', label: '财务费用' },
  { key: 'rdExp', label: '研发费用' },
  { key: 'ebit', label: 'EBIT（息税前利润）' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'basicEps', label: '基本每股收益', isEps: true },
];

const BALANCE_FIELDS: FieldDef[] = [
  { key: 'totalAssets', label: '资产总计', yoyKey: 'totalAssetsYoy' },
  { key: 'totalCurAssets', label: '  ↳ 流动资产合计' },
  { key: 'moneyCap', label: '    ↳ 货币资金' },
  { key: 'accountsReceiv', label: '    ↳ 应收账款' },
  { key: 'inventories', label: '    ↳ 存货' },
  { key: 'totalNca', label: '  ↳ 非流动资产合计' },
  { key: 'totalLiab', label: '负债合计' },
  { key: 'totalCurLiab', label: '  ↳ 流动负债合计' },
  { key: 'stBorr', label: '    ↳ 短期借款' },
  { key: 'totalNcl', label: '  ↳ 非流动负债合计' },
  { key: 'ltBorr', label: '    ↳ 长期借款' },
  { key: 'totalHldrEqyExcMinInt', label: '股东权益合计', yoyKey: 'equityYoy' },
  { key: 'totalHldrEqyIncMinInt', label: '  ↳ 含少数股东权益' },
];

const CASHFLOW_FIELDS: FieldDef[] = [
  { key: 'nCashflowAct', label: '经营活动净现金流', yoyKey: 'nCashflowActYoy' },
  { key: 'cFrSaleSg', label: '  ↳ 销售商品收到现金' },
  { key: 'cPaidGoodsS', label: '  ↳ 购买商品支出现金' },
  { key: 'nCashflowInvAct', label: '投资活动净现金流' },
  { key: 'nCashFlowsFncAct', label: '筹资活动净现金流' },
  { key: 'freeCashflow', label: '自由现金流', yoyKey: 'freeCashflowYoy' },
  { key: 'nIncrCashCashEqu', label: '现金及等价物净增加额' },
];

// 财务指标展示字段定义（原始关键指标 tab）
const FINANCIAL_FIELDS: Array<{ key: string; label: string; format?: 'number' | 'percent' }> = [
  { key: 'eps', label: '每股收益(EPS)' },
  { key: 'dtEps', label: '稀释每股收益' },
  { key: 'grossprofit_margin', label: '毛利率(%)', format: 'percent' },
  { key: 'netprofit_margin', label: '净利率(%)', format: 'percent' },
  { key: 'roe', label: 'ROE(%)', format: 'percent' },
  { key: 'dtRoe', label: '扣非ROE(%)', format: 'percent' },
  { key: 'roa', label: 'ROA(%)', format: 'percent' },
  { key: 'debtToAssets', label: '资产负债率(%)', format: 'percent' },
  { key: 'currentRatio', label: '流动比率' },
  { key: 'quickRatio', label: '速动比率' },
  { key: 'revenueYoy', label: '营收同比(%)', format: 'percent' },
  { key: 'netprofitYoy', label: '净利润同比(%)', format: 'percent' },
  { key: 'ocfToNetprofit', label: 'OCF/净利润(%)', format: 'percent' },
];

// ----------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------

export function StockDetailFinancialsTab({ tsCode }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('ratios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [financialsData, setFinancialsData] = useState<StockFinancialsData | null>(null);
  const [statementsData, setStatementsData] = useState<StockFinancialStatementsData | null>(null);

  const fetchAll = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const [fin, stmts] = await Promise.all([
        stockDetailApi.financials(tsCode, 8),
        stockDetailApi.financialStatements(tsCode, 8),
      ]);
      setFinancialsData(fin);
      setStatementsData(stmts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取财务数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Stack spacing={2}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────
  const history = financialsData?.history ?? [];
  const periods = history.slice(0, 8);
  const latestExpress = financialsData?.recentExpress ?? [];

  const incomePeriods = (statementsData?.income ?? []) as unknown as Record<string, unknown>[];
  const balancePeriods = (statementsData?.balanceSheet ?? []) as unknown as Record<
    string,
    unknown
  >[];
  const cashflowPeriods = (statementsData?.cashflow ?? []) as unknown as Record<string, unknown>[];

  return (
    <Stack spacing={3}>
      {/* ── Sub-tab navigation ────────────────────────────────────────── */}
      <Card>
        <CardContent sx={{ pb: '12px !important' }}>
          <Tabs
            value={subTab}
            onChange={(_, v: SubTab) => setSubTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="关键指标" value="ratios" />
            <Tab label="利润表" value="income" />
            <Tab label="资产负债表" value="balance" />
            <Tab label="现金流量表" value="cashflow" />
          </Tabs>

          {/* ── Tab: 关键指标 ──────────────────────────────────────────── */}
          {subTab === 'ratios' && (
            <>
              {/* 最新业绩快报 */}
              {latestExpress.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                    最新业绩快报
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>报告期</TableCell>
                          <TableCell align="right">营业收入(万元)</TableCell>
                          <TableCell align="right">净利润(万元)</TableCell>
                          <TableCell align="right">每股收益</TableCell>
                          <TableCell align="right">净资产收益率(%)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {latestExpress.map((row, i) => (
                          <TableRow key={i} hover>
                            <TableCell>{fmtPeriod(row.endDate)}</TableCell>
                            <TableCell align="right">{formatValue(row.revenue)}</TableCell>
                            <TableCell align="right">{formatValue(row.nIncome)}</TableCell>
                            <TableCell align="right">{formatValue(row.dilutedEps)}</TableCell>
                            <TableCell align="right">
                              {formatValue(row.dilutedRoe, 'percent')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* 历史财务指标 */}
              {periods.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">暂无财务数据</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'background.neutral',
                            minWidth: 110,
                          }}
                        >
                          报告期
                        </TableCell>
                        {FINANCIAL_FIELDS.map(({ label }) => (
                          <TableCell key={label} align="right">
                            {label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {periods.map((row, i) => (
                        <TableRow key={i} hover>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              bgcolor: 'background.paper',
                              color: 'text.secondary',
                              fontSize: 12,
                              minWidth: 110,
                            }}
                          >
                            {fmtPeriod(row.endDate ?? row.reportDate) || `期${i + 1}`}
                          </TableCell>
                          {FINANCIAL_FIELDS.map(({ key, format }) => (
                            <TableCell key={key} align="right">
                              {formatValue(row[key], format)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {/* ── Tab: 利润表 ────────────────────────────────────────────── */}
          {subTab === 'income' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle2">利润表</Typography>
                <Chip label="合并报表" size="small" variant="outlined" />
                <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
                  金额单位: 元 同比颜色: 红涨绿跌
                </Typography>
              </Box>
              <StatementTable periods={incomePeriods} fields={INCOME_FIELDS} />
            </>
          )}

          {/* ── Tab: 资产负债表 ────────────────────────────────────────── */}
          {subTab === 'balance' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle2">资产负债表</Typography>
                <Chip label="合并报表" size="small" variant="outlined" />
                <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
                  金额单位: 元
                </Typography>
              </Box>
              <StatementTable periods={balancePeriods} fields={BALANCE_FIELDS} />
            </>
          )}

          {/* ── Tab: 现金流量表 ────────────────────────────────────────── */}
          {subTab === 'cashflow' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle2">现金流量表</Typography>
                <Chip label="合并报表" size="small" variant="outlined" />
                <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
                  金额单位: 元 同比颜色: 红涨绿跌
                </Typography>
              </Box>
              <StatementTable periods={cashflowPeriods} fields={CASHFLOW_FIELDS} />
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
