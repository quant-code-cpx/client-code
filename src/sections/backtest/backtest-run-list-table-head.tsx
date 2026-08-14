import type { BacktestRunListItem, BacktestRunSortField } from 'src/api/backtest';

import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableSortLabel from '@mui/material/TableSortLabel';

import type { RunListSort } from './hooks/use-backtest-run-list-state';

// ----------------------------------------------------------------------

type SortableHeaderProps = {
  field: BacktestRunSortField;
  label: string;
  align?: 'right';
  sort: RunListSort;
  onSort: (field: BacktestRunSortField) => void;
};

function SortableHeader({ field, label, align, sort, onSort }: SortableHeaderProps) {
  const active = sort?.field === field;

  return (
    <TableCell align={align} sortDirection={active ? sort.order : false}>
      <TableSortLabel
        active={active}
        direction={active ? sort.order : 'desc'}
        onClick={() => onSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

type Props = {
  items: BacktestRunListItem[];
  selectedRunIds: ReadonlySet<string>;
  sort: RunListSort;
  onSort: (field: BacktestRunSortField) => void;
  onToggleSelectAll: (runIds: string[], checked: boolean) => void;
};

export function BacktestRunListTableHead({
  items,
  selectedRunIds,
  sort,
  onSort,
  onToggleSelectAll,
}: Props) {
  const visibleRunIds = items.map((item) => item.runId);
  const selectedVisibleCount = visibleRunIds.filter((runId) => selectedRunIds.has(runId)).length;
  const allVisibleSelected = items.length > 0 && selectedVisibleCount === items.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            size="small"
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={(event) => onToggleSelectAll(visibleRunIds, event.target.checked)}
            slotProps={{ input: { 'aria-label': '选择当前页回测任务' } }}
          />
        </TableCell>
        <TableCell>任务名称 / runId</TableCell>
        <TableCell>策略类型</TableCell>
        <TableCell>状态</TableCell>
        <TableCell>回测区间</TableCell>
        <TableCell>标签</TableCell>
        <SortableHeader
          field="totalReturn"
          label="总收益"
          align="right"
          sort={sort}
          onSort={onSort}
        />
        <SortableHeader
          field="maxDrawdown"
          label="最大回撤"
          align="right"
          sort={sort}
          onSort={onSort}
        />
        <SortableHeader
          field="sharpeRatio"
          label="夏普"
          align="right"
          sort={sort}
          onSort={onSort}
        />
        <SortableHeader field="durationSeconds" label="耗时" sort={sort} onSort={onSort} />
        <SortableHeader field="createdAt" label="创建时间" sort={sort} onSort={onSort} />
        <TableCell align="right">操作</TableCell>
      </TableRow>
    </TableHead>
  );
}
