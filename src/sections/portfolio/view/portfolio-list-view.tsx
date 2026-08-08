import type { IconifyProps } from 'src/components/iconify';
import type {
  PortfolioListItem,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
} from 'src/api/portfolio';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  listPortfolios,
  deletePortfolio,
  createPortfolio,
  updatePortfolio,
} from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';
import { PageHeader } from 'src/components/page-header';

import { PortfolioCard } from '../portfolio-card';
import { PortfolioEditDialog } from '../portfolio-edit-dialog';
import { PortfolioCreateDialog } from '../portfolio-create-dialog';
import { PortfolioDeleteDialog } from '../portfolio-delete-dialog';

// ----------------------------------------------------------------------

type PortfolioFilter = 'ALL' | 'LIVE' | 'PAPER' | 'ARCHIVED';

type PortfolioSort = 'updatedAt' | 'todayPnl' | 'totalMarketValue' | 'cumulativeReturn';

const SORT_LABELS: Record<PortfolioSort, string> = {
  updatedAt: '最近更新',
  todayPnl: '今日盈亏',
  totalMarketValue: '总市值',
  cumulativeReturn: '累计收益',
};

function metricValue(portfolio: PortfolioListItem, sort: PortfolioSort): number {
  if (sort === 'updatedAt') return new Date(portfolio.lastUpdated ?? portfolio.updatedAt).getTime();
  return portfolio[sort] ?? Number.NEGATIVE_INFINITY;
}

function EmptyGuideCard({
  icon,
  title,
  description,
}: {
  icon: IconifyProps['icon'];
  title: string;
  description: string;
}) {
  return (
    <Card sx={{ height: 1 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Iconify icon={icon} width={28} sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1">{title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function PortfolioListView() {
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PortfolioFilter>('ALL');
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<PortfolioSort>('updatedAt');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editPortfolio, setEditPortfolio] = useState<PortfolioListItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletePortfolioItem, setDeletePortfolioItem] = useState<PortfolioListItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPortfolios();
      setPortfolios(data);
    } catch {
      setError('加载组合列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const counts = useMemo(
    () => ({
      all: portfolios.filter((item) => !item.isArchived).length,
      live: portfolios.filter((item) => !item.isArchived && item.kind === 'LIVE').length,
      paper: portfolios.filter((item) => !item.isArchived && (item.kind ?? 'PAPER') === 'PAPER')
        .length,
      archived: portfolios.filter((item) => item.isArchived).length,
    }),
    [portfolios]
  );

  const visiblePortfolios = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return [...portfolios]
      .filter((portfolio) => {
        const kind = portfolio.kind ?? 'PAPER';
        const matchesFilter =
          filter === 'ALL'
            ? !portfolio.isArchived
            : filter === 'ARCHIVED'
              ? Boolean(portfolio.isArchived)
              : !portfolio.isArchived && kind === filter;
        const matchesKeyword =
          !normalizedKeyword ||
          portfolio.name.toLowerCase().includes(normalizedKeyword) ||
          (portfolio.description ?? '').toLowerCase().includes(normalizedKeyword);

        return matchesFilter && matchesKeyword;
      })
      .sort((left, right) => metricValue(right, sortBy) - metricValue(left, sortBy));
  }, [filter, keyword, portfolios, sortBy]);

  const handleCreate = async (data: CreatePortfolioRequest) => {
    setCreateSubmitting(true);
    try {
      await createPortfolio(data);
      setCreateOpen(false);
      await fetchPortfolios();
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdatePortfolioRequest) => {
    setEditSubmitting(true);
    try {
      await updatePortfolio(data);
      setEditPortfolio(null);
      await fetchPortfolios();
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePortfolioItem) return;
    setDeleteSubmitting(true);
    try {
      await deletePortfolio({ portfolioId: deletePortfolioItem.id });
      setDeletePortfolioItem(null);
      await fetchPortfolios();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <DashboardContent>
      <PageHeader
        title="我的组合"
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => setCreateOpen(true)}
          >
            新建组合
          </Button>
        }
        sx={{ mb: 3 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={filter}
              onChange={(_, value: PortfolioFilter | null) => value && setFilter(value)}
            >
              <ToggleButton value="ALL">全部 {counts.all}</ToggleButton>
              <ToggleButton value="LIVE">实盘 {counts.live}</ToggleButton>
              <ToggleButton value="PAPER">模拟 {counts.paper}</ToggleButton>
              <ToggleButton value="ARCHIVED">归档 {counts.archived}</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                value={keyword}
                placeholder="搜索组合名称 / 描述"
                onChange={(event) => setKeyword(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Iconify
                        icon="solar:magnifier-bold"
                        width={18}
                        sx={{ mr: 1, color: 'text.disabled' }}
                      />
                    ),
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>排序</InputLabel>
                <Select
                  label="排序"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as PortfolioSort)}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {visiblePortfolios.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <PortfolioCard
                portfolio={p}
                onEdit={setEditPortfolio}
                onDelete={setDeletePortfolioItem}
              />
            </Grid>
          ))}
          {portfolios.length === 0 && (
            <>
              <Grid size={{ xs: 12, md: 4 }}>
                <EmptyGuideCard
                  icon="solar:add-circle-bold"
                  title="新建空白组合"
                  description="适合手工录入持仓，作为实盘或模拟盘的基础账户。"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <EmptyGuideCard
                  icon="solar:chart-2-bold"
                  title="从回测导入"
                  description="跑完策略后把末日持仓灌入组合，形成研究到跟踪的闭环。"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <EmptyGuideCard
                  icon="solar:copy-bold"
                  title="复制成熟模板"
                  description="后端复制端点上线后，可快速生成年度组合或风格模板。"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
                  <Button variant="contained" onClick={() => setCreateOpen(true)}>
                    新建第一个组合
                  </Button>
                </Box>
              </Grid>
            </>
          )}
          {portfolios.length > 0 && visiblePortfolios.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography color="text.secondary" textAlign="center" sx={{ py: 8 }}>
                当前筛选下暂无组合，换个条件再看看。
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      <PortfolioCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
        submitting={createSubmitting}
      />

      <PortfolioEditDialog
        open={Boolean(editPortfolio)}
        portfolio={editPortfolio}
        onClose={() => setEditPortfolio(null)}
        onConfirm={handleEdit}
        submitting={editSubmitting}
      />

      <PortfolioDeleteDialog
        open={Boolean(deletePortfolioItem)}
        portfolio={deletePortfolioItem}
        onClose={() => setDeletePortfolioItem(null)}
        onConfirm={handleDelete}
        submitting={deleteSubmitting}
      />
    </DashboardContent>
  );
}
