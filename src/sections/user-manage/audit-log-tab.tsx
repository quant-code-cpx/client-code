import type { AuditAction, AuditResult, AuditLogItem } from 'src/api/user-manage';

import { useRef, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';

import { userManageApi } from 'src/api/user-manage';

import { AuditLogTable } from './audit-log-table';
import { AuditLogToolbar } from './audit-log-toolbar';

// ----------------------------------------------------------------------

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // 过滤条件（待应用）
  const [filterOperatorId, setFilterOperatorId] = useState<number | ''>('');
  const [filterTargetId, setFilterTargetId] = useState<number | ''>('');
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [filterResult, setFilterResult] = useState<AuditResult | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 已提交的过滤条件（点击查询后才更新）
  const [appliedFilter, setAppliedFilter] = useState({
    operatorId: '' as number | '',
    targetId: '' as number | '',
    action: '' as AuditAction | '',
    result: '' as AuditResult | '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const result = await userManageApi.getAuditLogs(
        {
          page: page + 1,
          pageSize,
          ...(appliedFilter.operatorId !== ''
            ? { operatorId: appliedFilter.operatorId as number }
            : {}),
          ...(appliedFilter.targetId !== '' ? { targetId: appliedFilter.targetId as number } : {}),
          ...(appliedFilter.action ? { action: appliedFilter.action } : {}),
          ...(appliedFilter.result ? { result: appliedFilter.result } : {}),
          ...(appliedFilter.startDate ? { startDate: appliedFilter.startDate } : {}),
          ...(appliedFilter.endDate ? { endDate: appliedFilter.endDate } : {}),
        },
        ctrl.signal
      );
      if (!ctrl.signal.aborted) {
        setLogs(result.items);
        setTotal(result.total);
      }
    } catch {
      if (!ctrl.signal.aborted) {
        setLogs([]);
        setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [page, pageSize, appliedFilter]);

  useEffect(() => {
    fetchLogs();
    return () => abortRef.current?.abort();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(0);
    setAppliedFilter({
      operatorId: filterOperatorId,
      targetId: filterTargetId,
      action: filterAction,
      result: filterResult,
      startDate,
      endDate,
    });
  };

  const handleReset = () => {
    setFilterOperatorId('');
    setFilterTargetId('');
    setFilterAction('');
    setFilterResult('');
    setStartDate('');
    setEndDate('');
    setPage(0);
    setAppliedFilter({
      operatorId: '',
      targetId: '',
      action: '',
      result: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <Card>
      <AuditLogToolbar
        filterOperatorId={filterOperatorId}
        filterTargetId={filterTargetId}
        filterAction={filterAction}
        filterResult={filterResult}
        startDate={startDate}
        endDate={endDate}
        onFilterOperatorId={setFilterOperatorId}
        onFilterTargetId={setFilterTargetId}
        onFilterAction={setFilterAction}
        onFilterResult={setFilterResult}
        onStartDate={setStartDate}
        onEndDate={setEndDate}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <AuditLogTable
        rows={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(0);
        }}
      />
    </Card>
  );
}
