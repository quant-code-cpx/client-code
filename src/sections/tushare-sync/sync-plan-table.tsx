import type { TushareSyncPlan, TushareSyncMode, SyncLogSummaryItem } from 'src/api/tushare-sync';

import { useMemo, useState } from 'react';

import Table from '@mui/material/Table';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

import { Scrollbar } from 'src/components/scrollbar';

import { SyncPlanTaskRow } from './sync-plan-task-row';
import { SYNC_PLAN_CATEGORY_ORDER, SYNC_PLAN_CATEGORY_LABELS } from './sync-plan-config';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'label', label: '任务名称', sortable: true },
  { id: 'category', label: '分类', width: 110 },
  { id: 'schedule', label: '定时计划', sortable: true },
  { id: 'supportsFullSync', label: '支持全量', width: 100, align: 'center' as const },
  { id: 'requiresTradeDate', label: '仅交易日', width: 100, align: 'center' as const },
  { id: 'lastStatus', label: '最后状态', width: 112, align: 'center' as const, sortable: true },
  { id: 'lastSyncAt', label: '最后同步', width: 180, sortable: true },
  {
    id: 'consecutiveFailures',
    label: '连失',
    width: 84,
    align: 'center' as const,
    sortable: true,
  },
  { id: 'actions', label: '操作', width: 112, align: 'center' as const },
];

type SortField = 'label' | 'schedule' | 'lastStatus' | 'lastSyncAt' | 'consecutiveFailures';
type SortOrder = 'asc' | 'desc';

type Props = {
  plans: TushareSyncPlan[];
  summary: SyncLogSummaryItem[];
  selected: Set<string>;
  mode: TushareSyncMode;
  plansLoading: boolean;
  isReadOnly: boolean;
  isSyncActionLocked: boolean;
  onToggleTask: (task: string) => void;
  onToggleCategory: (category: string) => void;
  onToggleAll: () => void;
  onRequestSync: (mode: TushareSyncMode, tasks: string[]) => void;
};

export function SyncPlanTable({
  plans,
  summary,
  selected,
  mode,
  plansLoading,
  isReadOnly,
  isSyncActionLocked,
  onToggleTask,
  onToggleCategory,
  onToggleAll,
  onRequestSync,
}: Props) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const summaryMap = useMemo(() => new Map(summary.map((item) => [item.task, item])), [summary]);

  const grouped = useMemo(
    () =>
      SYNC_PLAN_CATEGORY_ORDER.reduce<Record<string, TushareSyncPlan[]>>((acc, category) => {
        const categoryPlans = plans.filter((plan) => plan.category === category);
        if (!sortField) {
          acc[category] = categoryPlans;
          return acc;
        }

        acc[category] = categoryPlans
          .map((plan, index) => ({ plan, index }))
          .sort((left, right) => {
            const leftSummary = summaryMap.get(left.plan.task);
            const rightSummary = summaryMap.get(right.plan.task);
            const getValue = (plan: TushareSyncPlan, item?: SyncLogSummaryItem) => {
              switch (sortField) {
                case 'label':
                  return plan.label;
                case 'schedule':
                  return plan.schedule?.description ?? '仅手动触发';
                case 'lastStatus':
                  return item?.lastStatus ?? '';
                case 'lastSyncAt':
                  return item?.lastSyncAt ? Date.parse(item.lastSyncAt) : 0;
                case 'consecutiveFailures':
                  return item?.consecutiveFailures ?? 0;
                default:
                  return '';
              }
            };
            const leftValue = getValue(left.plan, leftSummary);
            const rightValue = getValue(right.plan, rightSummary);
            const comparison =
              typeof leftValue === 'number' && typeof rightValue === 'number'
                ? leftValue - rightValue
                : String(leftValue).localeCompare(String(rightValue), 'zh-CN');
            if (comparison === 0) return left.index - right.index;
            return sortOrder === 'asc' ? comparison : -comparison;
          })
          .map(({ plan }) => plan);
        return acc;
      }, {}),
    [plans, sortField, sortOrder, summaryMap]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortOrder('asc');
  };

  const allSelected = plans.length > 0 && selected.size === plans.length;
  const indeterminate = selected.size > 0 && !allSelected;

  return (
    <Scrollbar sx={{ maxHeight: { xs: 560, md: 680 } }}>
      <TableContainer sx={{ overflow: 'unset' }}>
        <Table stickyHeader sx={{ minWidth: 1180 }}>
          <TableHead>
            <TableRow sx={{ height: 52 }}>
              <TableCell padding="checkbox" sx={{ px: 1.25, py: 1, width: 52 }}>
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={onToggleAll}
                  disabled={plansLoading}
                  slotProps={{ input: { 'aria-label': '选择全部同步任务' } }}
                />
              </TableCell>
              {TABLE_HEAD.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align ?? 'left'}
                  sx={{
                    width: column.width,
                    minWidth: column.width,
                    px: 1.25,
                    py: 1,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    '& .MuiTableSortLabel-root': { whiteSpace: 'nowrap' },
                    '& .MuiTableSortLabel-icon': { ml: 0.25 },
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortField === column.id}
                      direction={sortField === column.id ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.id as SortField)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {plansLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell padding="checkbox">
                      <Skeleton variant="rectangular" width={18} height={18} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={120} />
                      <Skeleton width={80} height={12} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={70} height={22} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={160} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={48} height={22} sx={{ mx: 'auto' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={48} height={22} sx={{ mx: 'auto' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={64} height={22} sx={{ mx: 'auto' }} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={128} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={32} sx={{ mx: 'auto' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={68} height={28} sx={{ mx: 'auto' }} />
                    </TableCell>
                  </TableRow>
                ))
              : SYNC_PLAN_CATEGORY_ORDER.filter(
                  (category) => (grouped[category]?.length ?? 0) > 0
                ).flatMap((category) => {
                  const categoryPlans = grouped[category] ?? [];
                  const categoryAllSelected = categoryPlans.every((plan) =>
                    selected.has(plan.task)
                  );
                  const categorySomeSelected = categoryPlans.some((plan) =>
                    selected.has(plan.task)
                  );

                  return [
                    <TableRow key={`hdr-${category}`} sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={categoryAllSelected}
                          indeterminate={categorySomeSelected && !categoryAllSelected}
                          onChange={() => onToggleCategory(category)}
                          slotProps={{
                            input: {
                              'aria-label': `选择${SYNC_PLAN_CATEGORY_LABELS[category] ?? category}全部任务`,
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell colSpan={TABLE_HEAD.length}>
                        <Typography variant="subtitle2">
                          {SYNC_PLAN_CATEGORY_LABELS[category] ?? category}
                        </Typography>
                      </TableCell>
                    </TableRow>,
                    ...categoryPlans.map((plan) => (
                      <SyncPlanTaskRow
                        key={plan.task}
                        plan={plan}
                        summary={summaryMap.get(plan.task)}
                        mode={mode}
                        isSelected={selected.has(plan.task)}
                        isReadOnly={isReadOnly}
                        isSyncActionLocked={isSyncActionLocked}
                        plansLoading={plansLoading}
                        onToggle={onToggleTask}
                        onRequestSync={onRequestSync}
                      />
                    )),
                  ];
                })}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
