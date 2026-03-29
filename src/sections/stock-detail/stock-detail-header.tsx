import type { StockDetailOverviewData } from 'src/api/stock';

import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';
import * as numberFormat from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
  overview: StockDetailOverviewData | null;
  loading: boolean;
};

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: { xs: 'calc(50% - 12px)', sm: 96 } }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="fontWeightMedium">
        {value}
      </Typography>
    </Box>
  );
}

function formatDateValue(value: string | null | undefined) {
  return value ? fDate(value, 'YYYY-MM-DD') : '-';
}

function formatShareWan(value: number | null | undefined) {
  return value != null
    ? numberFormat.fWanYuan(value, 2).replace(/万$|亿$/, (unit) => `${unit}股`)
    : '-';
}

function mapListStatus(value: string | null | undefined) {
  if (!value) return '';
  return { L: '上市', D: '退市', P: '暂停上市' }[value] ?? value;
}

function mapHs(value: string | null | undefined) {
  if (!value || value === 'N') return '';
  return { H: '沪股通', S: '深股通' }[value] ?? value;
}

function mapLimitStatus(value: number | null | undefined) {
  if (value === 1) return { label: '涨停', color: 'error' as const };
  if (value === -1) return { label: '跌停', color: 'success' as const };
  return null;
}

// ----------------------------------------------------------------------

export function StockDetailHeader({ tsCode, overview, loading }: Props) {
  const navigate = useNavigate();

  const basic = overview?.basic;
  const quote = overview?.latestQuote;
  const valuation = overview?.latestValuation;

  const name = basic?.name ?? '-';
  // 交易所：优先使用后端返回值，否则根据股票代码后缀推断
  const exchangeRaw = basic?.exchange;
  const exchange =
    exchangeRaw ||
    (tsCode.endsWith('.SH')
      ? '上交所'
      : tsCode.endsWith('.SZ')
        ? '深交所'
        : tsCode.endsWith('.BJ')
          ? '北交所'
          : '');
  const market = basic?.market ?? '';
  const industry = basic?.industry ?? '';
  const area = basic?.area ?? '';
  const listStatus = mapListStatus(basic?.listStatus);
  const hsTag = mapHs(basic?.isHs);

  const close = quote?.close;
  const pctChg = quote?.pctChg;
  const preClose = quote?.preClose;
  const high = quote?.high;
  const low = quote?.low;
  const open = quote?.open;
  const vol = quote?.vol;
  const amount = quote?.amount;
  const change = quote?.change;
  const tradeDate = quote?.tradeDate ?? valuation?.tradeDate ?? basic?.listDate ?? null;

  const turnoverRate = valuation?.turnoverRate;
  const turnoverRateF = valuation?.turnoverRateF;
  const volumeRatio = valuation?.volumeRatio;
  const pe = valuation?.pe;
  const peTtm = valuation?.peTtm;
  const pb = valuation?.pb;
  const psTtm = valuation?.psTtm;
  const dvTtm = valuation?.dvTtm;
  const totalShare = valuation?.totalShare;
  const floatShare = valuation?.floatShare;
  const freeShare = valuation?.freeShare;
  const totalMv = valuation?.totalMv;
  const circMv = valuation?.circMv;
  const limitStatus = mapLimitStatus(valuation?.limitStatus);

  const isUp = (pctChg ?? 0) > 0;
  const isDown = (pctChg ?? 0) < 0;
  const priceColor = isUp ? 'error.main' : isDown ? 'success.main' : 'text.primary';
  const pctChgLabelColor = isUp ? 'error' : isDown ? 'success' : 'default';

  if (loading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Skeleton width={240} height={36} />
        <Skeleton width={220} height={24} sx={{ mt: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} width={64} height={24} sx={{ borderRadius: 999 }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
          {[...Array(14)].map((_, i) => (
            <Skeleton key={i} width={80} height={48} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* 股票名称 + 代码 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ mr: 0.5 }}>
          <Iconify
            icon="eva:arrow-ios-forward-fill"
            width={22}
            sx={{ transform: 'rotate(180deg)' }}
          />
        </IconButton>
        <Typography variant="h4">{name}</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {tsCode}
        </Typography>
        {exchange && (
          <Chip
            label={exchange}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
        )}
        {market && (
          <Chip label={market} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
        )}
        {industry && (
          <Chip
            label={industry}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
        )}
        {area && (
          <Chip label={area} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
        )}
        {listStatus && (
          <Chip label={listStatus} size="small" color="default" sx={{ height: 22, fontSize: 11 }} />
        )}
        {hsTag && (
          <Label color="info" variant="soft" sx={{ height: 22, fontSize: 11, px: 1.25 }}>
            {hsTag}
          </Label>
        )}
      </Box>

      {/* 价格 + 涨跌幅 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h3" sx={{ color: priceColor, fontWeight: 'fontWeightBold' }}>
          {numberFormat.fNumber(close)}
        </Typography>
        <Label variant="filled" color={pctChgLabelColor} sx={{ fontSize: 14, px: 1.5, py: 0.5 }}>
          {numberFormat.fPctChg(pctChg)}
        </Label>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          涨跌额 {numberFormat.fNumber(change)}
        </Typography>
        {limitStatus && (
          <Label variant="soft" color={limitStatus.color} sx={{ fontSize: 12, px: 1.25 }}>
            {limitStatus.label}
          </Label>
        )}
      </Box>

      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 2 }}>
        最新交易日：{formatDateValue(tradeDate)} / 上市日期：{formatDateValue(basic?.listDate)}
      </Typography>

      {/* 基础信息：行情 + 估值股本 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            行情指标
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
            <StatItem label="今开" value={numberFormat.fNumber(open)} />
            <StatItem label="昨收" value={numberFormat.fNumber(preClose)} />
            <StatItem label="最高" value={numberFormat.fNumber(high)} />
            <StatItem label="最低" value={numberFormat.fNumber(low)} />
            <StatItem label="成交量" value={numberFormat.fWanYi(vol, '手')} />
            <StatItem
              label="成交额"
              value={numberFormat.fWanYuan(amount != null ? amount / 10 : null)}
            />
            <StatItem label="换手率" value={numberFormat.fRatePercent(turnoverRate)} />
            <StatItem label="自由流通换手" value={numberFormat.fRatePercent(turnoverRateF)} />
            <StatItem label="量比" value={numberFormat.fNumber(volumeRatio)} />
          </Box>
        </Box>

        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            估值与股本
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
            <StatItem label="市盈率" value={numberFormat.fNumber(pe)} />
            <StatItem label="市盈率TTM" value={numberFormat.fNumber(peTtm)} />
            <StatItem label="市净率" value={numberFormat.fNumber(pb)} />
            <StatItem label="市销率TTM" value={numberFormat.fNumber(psTtm)} />
            <StatItem label="股息率TTM" value={numberFormat.fRatePercent(dvTtm)} />
            <StatItem label="总市值" value={numberFormat.fWanYuan(totalMv)} />
            <StatItem label="流通市值" value={numberFormat.fWanYuan(circMv)} />
            <StatItem label="总股本" value={formatShareWan(totalShare)} />
            <StatItem label="流通股本" value={formatShareWan(floatShare)} />
            <StatItem label="自由流通股" value={formatShareWan(freeShare)} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
