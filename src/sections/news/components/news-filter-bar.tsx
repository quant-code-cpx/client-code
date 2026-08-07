import type { Theme } from '@mui/material/styles';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import FilterListIcon from '@mui/icons-material/FilterList';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { serializeNewsUrlState } from '../news-url-state';
import { NewsSecurityMultiSelect } from './news-security-multi-select';

import type {
  NewsScope,
  NewsUrlState,
  NewsSourceType,
  NewsContentType,
  NewsFilterErrors,
} from '../news-url-state';

export type NewsFilterBarProps = {
  value: NewsUrlState;
  errors: NewsFilterErrors;
  onApply: (value: NewsUrlState) => void;
  onClear: () => void;
};

const SCOPE_OPTIONS: Array<{ value: NewsScope; label: string }> = [
  { value: 'ALL', label: '全市场' },
  { value: 'WATCHLIST', label: '自选股' },
  { value: 'PORTFOLIO', label: '组合' },
  { value: 'SECURITIES', label: '指定证券' },
];

const CONTENT_OPTIONS: Array<{ value: NewsContentType; label: string }> = [
  { value: 'NOTICE', label: '公告' },
  { value: 'NEWS', label: '新闻' },
  { value: 'FLASH', label: '快讯' },
];

const SOURCE_OPTIONS: Array<{ value: NewsSourceType; label: string }> = [
  { value: 'REGULATOR', label: '监管' },
  { value: 'EXCHANGE', label: '交易所' },
  { value: 'COMPANY', label: '公司' },
  { value: 'MEDIA', label: '媒体' },
  { value: 'INSTITUTION', label: '机构' },
  { value: 'AGGREGATOR', label: '聚合器' },
  { value: 'OTHER', label: '其他' },
];

export function NewsFilterBar({ value, errors, onApply, onClear }: NewsFilterBarProps) {
  const valueKey = useMemo(() => serializeNewsUrlState(value).toString(), [value]);
  const compact = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [draft, setDraft] = useState(value);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDraft(value), [value, valueKey]);

  const handleApply = (next: NewsUrlState) => {
    onApply(next);
    setDrawerOpen(false);
  };
  const handleClear = () => {
    setDraft(value);
    onClear();
    setDrawerOpen(false);
  };

  if (compact) {
    return (
      <>
        <Card variant="outlined">
          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Button
              fullWidth
              color="inherit"
              aria-label="筛选新闻"
              startIcon={<FilterListIcon />}
              onClick={() => setDrawerOpen(true)}
              sx={{ justifyContent: 'space-between' }}
            >
              筛选新闻
              <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                {filterSummary(value)}
              </Typography>
            </Button>
          </CardContent>
        </Card>
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{
            paper: {
              role: 'dialog',
              'aria-labelledby': 'news-filter-drawer-title',
              sx: { maxHeight: '92dvh', borderRadius: '16px 16px 0 0' },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography id="news-filter-drawer-title" variant="h6" sx={{ flex: 1 }}>
              新闻筛选
            </Typography>
            <IconButton aria-label="关闭新闻筛选" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <Box sx={{ p: 2, overflowY: 'auto' }}>
            <NewsFilterForm
              draft={draft}
              errors={errors}
              setDraft={setDraft}
              onApply={handleApply}
              onClear={handleClear}
            />
          </Box>
        </Drawer>
      </>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <NewsFilterForm
          draft={draft}
          errors={errors}
          setDraft={setDraft}
          onApply={handleApply}
          onClear={handleClear}
        />
      </CardContent>
    </Card>
  );
}

function NewsFilterForm({
  draft,
  errors,
  setDraft,
  onApply,
  onClear,
}: {
  draft: NewsUrlState;
  errors: NewsFilterErrors;
  setDraft: React.Dispatch<React.SetStateAction<NewsUrlState>>;
  onApply: (value: NewsUrlState) => void;
  onClear: () => void;
}) {
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={draft.scope}
            aria-label="新闻范围"
            onChange={(_, next: NewsScope | null) => {
              if (next) setDraft((current) => ({ ...current, scope: next }));
            }}
          >
            {SCOPE_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            size="small"
            label="搜索标题或摘要"
            value={draft.keyword}
            error={Boolean(errors.keyword)}
            helperText={errors.keyword}
            onChange={(event) =>
              setDraft((current) => ({ ...current, keyword: event.target.value }))
            }
            sx={{ minWidth: { lg: 260 }, flex: 1 }}
          />

          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained">
              应用筛选
            </Button>
            <Button type="button" color="inherit" onClick={onClear}>
              清空
            </Button>
          </Stack>
        </Stack>

        {draft.scope === 'SECURITIES' ? (
          <NewsSecurityMultiSelect
            value={draft.securityCodes}
            error={errors.securityCodes}
            onChange={(securityCodes) =>
              setDraft((current) => ({
                ...current,
                securityCodes,
              }))
            }
          />
        ) : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FilterToggleGroup
            label="内容类型"
            value={draft.contentTypes}
            options={CONTENT_OPTIONS}
            onChange={(contentTypes) => setDraft((current) => ({ ...current, contentTypes }))}
          />
          <FilterToggleGroup
            label="来源类型"
            value={draft.sourceTypes}
            options={SOURCE_OPTIONS}
            onChange={(sourceTypes) => setDraft((current) => ({ ...current, sourceTypes }))}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            type="date"
            label="开始日"
            value={draft.from ?? ''}
            error={Boolean(errors.dateRange)}
            onChange={(event) =>
              setDraft((current) => ({ ...current, from: event.target.value || null }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="结束日"
            value={draft.to ?? ''}
            error={Boolean(errors.dateRange)}
            helperText={errors.dateRange}
            onChange={(event) =>
              setDraft((current) => ({ ...current, to: event.target.value || null }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={draft.includeUnknownPublishedTime}
                onChange={(_, checked) =>
                  setDraft((current) => ({ ...current, includeUnknownPublishedTime: checked }))
                }
              />
            }
            label="包含发布时间未知"
          />
        </Stack>
      </Stack>
    </Box>
  );
}

function FilterToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T[];
  options: Array<{ value: T; label: string }>;
  onChange: (value: T[]) => void;
}) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        size="small"
        value={value}
        aria-label={label}
        onChange={(_, next: T[]) => onChange(next)}
        sx={{ flexWrap: 'wrap' }}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

function filterSummary(value: NewsUrlState): string {
  const active =
    value.contentTypes.length +
    value.sourceTypes.length +
    value.securityCodes.length +
    Number(Boolean(value.keyword || value.from || value.to || value.includeUnknownPublishedTime));
  return active > 0 ? `${active} 项条件` : '全部新闻';
}
