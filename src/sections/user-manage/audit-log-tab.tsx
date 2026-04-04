import type { AuditAction, AuditLogItem } from 'src/api/user-manage';

import { useState, useEffect, useCallback } from 'react';

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

  // 过滤条件（待应用）
  const [filterOperatorId, setFilterOperatorId] = useState<number | ''>('');
  const [filterTargetId, setFilterTargetId] = useState<number | ''>('');
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 已提交的过滤条件（点击查询后才更新）
  const [appliedFilter, setAppliedFilter] = useState({
    operatorId: '' as number | '',
    targetId: '' as number | '',
    action: '' as AuditAction | '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    try {
      const result = await userManageApi.getAuditLogs({
        page: page + 1,
        pageSize,
        ...(appliedFilter.operatorId !== '' ? { operatorId: appliedFilter.operatorId as number } : {}),
        ...(appliedFilter.targetId !== '' ? { targetId: appliedFilter.targetId as number } : {}),
        ...(appliedFilter.action ? { action: appliedFilter.action } : {}),
        ...(appliedFilter.startDate ? { startDate: appliedFilter.startDate } : {}),
        ...(appliedFilter.endDate ? { endDate: appliedFilter.endDate } : {}),
      });
      if (!cancelled) {
        setLogs(result.items);
        setTotal(result.total);
      }
    } catch {
      if (!cancelled) {
        setLogs([]);
        setTotal(0);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(0);
    setAppliedFilter({
      operatorId: filterOperatorId,
      targetId: filterTargetId,
      action: filterAction,
      startDate,
      endDate,
    });
  };

  const handleReset = () => {
    setFilterOperatorId('');
    setFilterTargetId('');
    setFilterAction('');
    setStartDate('');
    setEndDate('');
    setPage(0);
    setAppliedFilter({
      operatorId: '',
      targetId: '',
      action: '',
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
        startDate={startDate}
        endDate={endDate}
        onFilterOperatorId={setFilterOperatorId}
        onFilterTargetId={setFilterTargetId}
        onFilterAction={setFilterAction}
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
