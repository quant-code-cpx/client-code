import type { StockScreenerItem } from 'src/api/screener';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fNumber, fPctChg, fWanYuan, fRatePercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type ScreenerResultTableRowProps = {
  row: StockScreenerItem;
  visibleColumns: string[];
};

// ----------------------------------------------------------------------

/** 万元主力净流入格式化：绝对值 > 10000万 → 转亿 */
function fMainNetInflow(value: number | null): string {
  if (value === null) return '—';
  const abs = Math.abs(value);
  if (abs >= 10000) return `${(value / 10000).toFixed(2)}亿`;
  return `${value.toFixed(2)}万`;
}

/** 带符号百分号，null → '—' */
function fSignedPct(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** PE/PB：负值显示"亏损" */
function fPeOrPb(value: number | null): string {
  if (value === null) return '—';
  if (value < 0) return '亏损';
  return fNumber(value);
}

/** 颜色：正 → error.main，负 → success.main，0/null → text.secondary */
function signColor(value: number | null): string {
  if (value === null || value === 0) return 'text.secondary';
  return value > 0 ? 'error.main' : 'success.main';
}

// ----------------------------------------------------------------------

export function ScreenerResultTableRow({ row, visibleColumns }: ScreenerResultTableRowProps) {
  const visible = new Set(visibleColumns);

  const pctChgColor =
    (row.pctChg ?? 0) > 0 ? 'error' : (row.pctChg ?? 0) < 0 ? 'success' : 'default';

  return (
    <TableRow hover sx={{ cursor: 'pointer' }}>
      {/* 名称/代码 — 固定列 */}
      <TableCell
        sx={{
          position: 'sticky',
          left: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          boxShadow: '2px 0 6px -2px rgba(0,0,0,0.12)',
        }}
      >
        <Typography
          component={RouterLink}
          href={`/stock/detail?code=${encodeURIComponent(row.tsCode)}`}
          variant="body2"
          fontWeight="fontWeightMedium"
          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          {row.name ?? '—'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {row.tsCode}
        </Typography>
      </TableCell>

      {/* 最新价 */}
      {visible.has('close') && (
        <TableCell align="right">
          <Typography variant="body2" fontWeight="fontWeightMedium">
            {row.close != null ? row.close.toFixed(2) : '—'}
          </Typography>
        </TableCell>
      )}

      {/* 涨跌幅 */}
      {visible.has('pctChg') && (
        <TableCell align="right">
          <Label variant="soft" color={pctChgColor}>
            {fPctChg(row.pctChg)}
          </Label>
        </TableCell>
      )}

      {/* 总市值 */}
      {visible.has('totalMv') && (
        <TableCell align="right">{fWanYuan(row.totalMv)}</TableCell>
      )}

      {/* PE TTM */}
      {visible.has('peTtm') && (
        <TableCell align="right">
          <Typography
            variant="body2"
            sx={{ color: (row.peTtm ?? 0) < 0 ? 'error.main' : 'text.primary' }}
          >
            {fPeOrPb(row.peTtm)}
          </Typography>
        </TableCell>
      )}

      {/* PB */}
      {visible.has('pb') && (
        <TableCell align="right">
          <Typography
            variant="body2"
            sx={{ color: (row.pb ?? 0) < 0 ? 'error.main' : 'text.primary' }}
          >
            {fPeOrPb(row.pb)}
          </Typography>
        </TableCell>
      )}

      {/* 股息率 */}
      {visible.has('dvTtm') && (
        <TableCell align="right">{fRatePercent(row.dvTtm)}</TableCell>
      )}

      {/* 换手率 */}
      {visible.has('turnoverRate') && (
        <TableCell align="right">{fRatePercent(row.turnoverRate)}</TableCell>
      )}

      {/* ROE */}
      {visible.has('roe') && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: signColor(row.roe) }}>
            {row.roe != null ? `${row.roe.toFixed(2)}%` : '—'}
          </Typography>
        </TableCell>
      )}

      {/* 营收增速 */}
      {visible.has('revenueYoy') && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: signColor(row.revenueYoy) }}>
            {fSignedPct(row.revenueYoy)}
          </Typography>
        </TableCell>
      )}

      {/* 净利增速 */}
      {visible.has('netprofitYoy') && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: signColor(row.netprofitYoy) }}>
            {fSignedPct(row.netprofitYoy)}
          </Typography>
        </TableCell>
      )}

      {/* 毛利率 */}
      {visible.has('grossMargin') && (
        <TableCell align="right">
          {row.grossMargin != null ? `${row.grossMargin.toFixed(2)}%` : '—'}
        </TableCell>
      )}

      {/* 净利率 */}
      {visible.has('netMargin') && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: signColor(row.netMargin) }}>
            {fSignedPct(row.netMargin)}
          </Typography>
        </TableCell>
      )}

      {/* 资产负债率 */}
      {visible.has('debtToAssets') && (
        <TableCell align="right">
          {row.debtToAssets != null ? `${row.debtToAssets.toFixed(2)}%` : '—'}
        </TableCell>
      )}

      {/* 流动比率 */}
      {visible.has('currentRatio') && (
        <TableCell align="right">
          {row.currentRatio != null ? row.currentRatio.toFixed(2) : '—'}
        </TableCell>
      )}

      {/* 速动比率 */}
      {visible.has('quickRatio') && (
        <TableCell align="right">
          {row.quickRatio != null ? row.quickRatio.toFixed(2) : '—'}
        </TableCell>
      )}

      {/* OCF/净利 */}
      {visible.has('ocfToNetprofit') && (
        <TableCell align="right">
          {row.ocfToNetprofit != null ? row.ocfToNetprofit.toFixed(2) : '—'}
        </TableCell>
      )}

      {/* 5日主力净流入 */}
      {visible.has('mainNetInflow5d') && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: signColor(row.mainNetInflow5d) }}>
            {fMainNetInflow(row.mainNetInflow5d)}
          </Typography>
        </TableCell>
      )}

      {/* 20日主力净流入 */}
      {visible.has('mainNetInflow20d') && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: signColor(row.mainNetInflow20d) }}>
            {fMainNetInflow(row.mainNetInflow20d)}
          </Typography>
        </TableCell>
      )}

      {/* 行业 */}
      {visible.has('industry') && (
        <TableCell>{row.industry ?? '—'}</TableCell>
      )}

      {/* 板块 */}
      {visible.has('market') && (
        <TableCell>{row.market ?? '—'}</TableCell>
      )}

      {/* 财报期 */}
      {visible.has('latestFinDate') && (
        <TableCell align="center">
          {row.latestFinDate ? fDate(row.latestFinDate, 'YYYY-MM-DD') : '—'}
        </TableCell>
      )}
    </TableRow>
  );
}
