import type { KlineBlock } from 'src/types/agent/generated';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { StockKline, normalizeKlineSeries } from 'src/components/stock-kline/stock-kline';

import { DataProvenance } from '../data-provenance';

export function StockKlineBlock({ block }: { block: KlineBlock }) {
  const series = normalizeKlineSeries(block);
  return (
    <Box>
      {block.title ? <Typography variant="subtitle1" sx={{ mb: 1 }}>{block.title}</Typography> : null}
      <StockKline series={series} />
      <DataProvenance provenance={block.provenance} />
    </Box>
  );
}
