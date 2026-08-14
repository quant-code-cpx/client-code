import type {
  AreaItem,
  IndustryItem,
  ScreenerFilters,
  ScreenerConceptItem,
} from 'src/api/screener';

import { memo, useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';

import { Iconify } from 'src/components/iconify';

import { BasicFilterEditor, ConceptFilterEditor } from './screener-filter-basic-editors';
import {
  MarketFilterEditor,
  TechnicalFilterEditor,
  NorthboundFilterEditor,
} from './screener-filter-signal-editors';
import {
  FlowFilterEditor,
  GrowthFilterEditor,
  FinancialFilterEditor,
  ValuationFilterEditor,
  ProfitabilityFilterEditor,
} from './screener-filter-fundamental-editors';

// ----------------------------------------------------------------------

type FilterGroupId =
  | 'basic'
  | 'concept'
  | 'valuation'
  | 'growth'
  | 'profitability'
  | 'financial'
  | 'flow'
  | 'market'
  | 'technical'
  | 'northbound';

type FilterGroup = {
  id: FilterGroupId;
  label: string;
  keys: (keyof ScreenerFilters)[];
};

export const FILTER_GROUPS: FilterGroup[] = [
  { id: 'basic', label: '基本面', keys: ['exchange', 'market', 'industries', 'areas'] },
  { id: 'concept', label: '概念板块', keys: ['conceptCodes'] },
  {
    id: 'valuation',
    label: '估值',
    keys: [
      'minPeTtm',
      'maxPeTtm',
      'minPb',
      'maxPb',
      'minPsTtm',
      'maxPsTtm',
      'minDvTtm',
      'minTotalMv',
      'maxTotalMv',
    ],
  },
  {
    id: 'growth',
    label: '成长',
    keys: ['minRevenueYoy', 'maxRevenueYoy', 'minNetprofitYoy', 'maxNetprofitYoy'],
  },
  {
    id: 'profitability',
    label: '盈利',
    keys: ['minRoe', 'maxRoe', 'minGrossMargin', 'minNetMargin'],
  },
  {
    id: 'financial',
    label: '财务 / 现金流',
    keys: ['maxDebtToAssets', 'minCurrentRatio', 'minQuickRatio', 'minOcfToNetprofit'],
  },
  {
    id: 'flow',
    label: '资金流向',
    keys: ['minMainNetInflow5d', 'minMainNetInflow20d'],
  },
  {
    id: 'market',
    label: '行情',
    keys: ['minPctChg', 'maxPctChg', 'minTurnoverRate', 'maxTurnoverRate'],
  },
  {
    id: 'technical',
    label: '技术信号',
    keys: [
      'macdSignal',
      'kdjSignal',
      'rsiSignal',
      'minRsi6',
      'maxRsi6',
      'bollSignal',
      'maTrend',
      'minBuySignalCount',
    ],
  },
  { id: 'northbound', label: '北向资金', keys: ['northboundOnly'] },
];

export const VISIBLE_FILTER_CONTROL_COUNT = FILTER_GROUPS.reduce(
  (total, group) => total + group.keys.length,
  0
);

function isFilterActive(value: ScreenerFilters[keyof ScreenerFilters]): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value === true;
  return value !== undefined && value !== null && value !== '';
}

export function countActiveFilters(filters: ScreenerFilters, keys?: (keyof ScreenerFilters)[]) {
  const targetKeys = keys ?? FILTER_GROUPS.flatMap((group) => group.keys);
  return targetKeys.reduce((count, key) => count + (isFilterActive(filters[key]) ? 1 : 0), 0);
}

// ----------------------------------------------------------------------

type ScreenerFilterPanelProps = {
  filters: ScreenerFilters;
  industries: IndustryItem[];
  areas: AreaItem[];
  concepts?: ScreenerConceptItem[];
  onChange: (newFilters: ScreenerFilters) => void;
  onSearch?: () => void;
  onReset?: () => void;
  searchDisabled?: boolean;
};

export const ScreenerFilterPanel = memo(function ScreenerFilterPanelComponent({
  filters,
  industries,
  areas,
  concepts = [],
  onChange,
  onSearch,
  onReset,
  searchDisabled = false,
}: ScreenerFilterPanelProps) {
  const [activeGroup, setActiveGroup] = useState<FilterGroupId>('basic');

  const setFilter = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const activeDefinition = FILTER_GROUPS.find((group) => group.id === activeGroup)!;

  const renderEditor = () => {
    switch (activeGroup) {
      case 'basic':
        return (
          <BasicFilterEditor
            filters={filters}
            industries={industries}
            areas={areas}
            setFilter={setFilter}
          />
        );
      case 'concept':
        return <ConceptFilterEditor filters={filters} concepts={concepts} setFilter={setFilter} />;
      case 'valuation':
        return <ValuationFilterEditor filters={filters} setFilter={setFilter} />;
      case 'growth':
        return <GrowthFilterEditor filters={filters} setFilter={setFilter} />;
      case 'profitability':
        return <ProfitabilityFilterEditor filters={filters} setFilter={setFilter} />;
      case 'financial':
        return <FinancialFilterEditor filters={filters} setFilter={setFilter} />;
      case 'flow':
        return <FlowFilterEditor filters={filters} setFilter={setFilter} />;
      case 'market':
        return <MarketFilterEditor filters={filters} setFilter={setFilter} />;
      case 'technical':
        return <TechnicalFilterEditor filters={filters} setFilter={setFilter} />;
      case 'northbound':
        return <NorthboundFilterEditor filters={filters} setFilter={setFilter} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: 300,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '168px minmax(0, 1fr)' },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box
        component="nav"
        aria-label="选股条件分组"
        sx={{
          p: 1,
          borderRight: { xs: 0, sm: '1px solid' },
          borderBottom: { xs: '1px solid', sm: 0 },
          borderColor: 'divider',
          bgcolor: 'background.neutral',
        }}
      >
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          sx={{ px: 1, py: 0.75 }}
        >
          <Typography variant="subtitle2">筛选条件</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {countActiveFilters(filters)} 条
          </Typography>
        </Stack>
        <List
          disablePadding
          sx={{
            display: { xs: 'flex', sm: 'block' },
            gap: { xs: 0.5, sm: 0 },
            overflowX: { xs: 'auto', sm: 'visible' },
          }}
        >
          {FILTER_GROUPS.map((group) => {
            const count = countActiveFilters(filters, group.keys);
            return (
              <ListItemButton
                key={group.id}
                selected={activeGroup === group.id}
                onClick={() => setActiveGroup(group.id)}
                sx={{ minHeight: 44, borderRadius: 1, flexShrink: 0 }}
              >
                <ListItemText
                  primary={group.label}
                  slotProps={{ primary: { variant: 'body2', whiteSpace: 'nowrap' } }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: count > 0 ? 'primary.main' : 'text.disabled', ml: 1 }}
                >
                  {count}
                </Typography>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {activeDefinition.label}
        </Typography>
        {renderEditor()}
        {onSearch && onReset ? (
          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 2.5 }}>
            <Button variant="outlined" onClick={onReset}>
              重置条件
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:search-fill" />}
              onClick={onSearch}
              disabled={searchDisabled}
            >
              开始选股
            </Button>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
});
