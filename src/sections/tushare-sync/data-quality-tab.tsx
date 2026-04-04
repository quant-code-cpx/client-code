import type { MouseEvent } from 'react';
import type { DataQualityCheckItem, ValidationLogItem } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Iconify } from 'src/components/iconify';

import { DataGapsPanel } from './data-gaps-panel';
import { ValidationLogTable } from './validation-log-table';
import { DataQualityReportTable } from './data-quality-report-table';

// ----------------------------------------------------------------------

export function DataQualityTab() {
  const [qualityDays, setQualityDays] = useState(7);
  const [qualityReport, setQualityReport] = useState<DataQualityCheckItem[]>([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [checkTriggering, setCheckTriggering] = useState(false);
  const [checkAlert, setCheckAlert] = useState('');

  const [validationLogs, setValidationLogs] = useState<ValidationLogItem[]>([]);
  const [validationLoading, setValidationLoading] = useState(true);

  const fetchReport = useCallback(
    async (days: number) => {
      setReportLoading(true);
      try {
        const data = await tushareSyncApi.getQualityReport(days);
        setQualityReport(data);
      } catch {
        // ignore
      } finally {
        setReportLoading(false);
      }
    },
    []
  );

  const fetchValidationLogs = useCallback(async () => {
    setValidationLoading(true);
    try {
      const data = await tushareSyncApi.getValidationLogs(undefined, 100);
      setValidationLogs(data);
    } catch {
      // ignore
    } finally {
      setValidationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(qualityDays);
    fetchValidationLogs();
  }, [fetchReport, fetchValidationLogs, qualityDays]);

  const handleTriggerCheck = async () => {
    setCheckTriggering(true);
    setCheckAlert('');
    try {
      const res = await tushareSyncApi.triggerQualityCheck();
      setCheckAlert(res.message || '检查已提交，结果稍后更新');
    } catch (err) {
      setCheckAlert(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setCheckTriggering(false);
    }
  };

  const handleDaysChange = (_: MouseEvent<HTMLElement>, val: number | null) => {
    if (val !== null) {
      setQualityDays(val);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      {checkAlert && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          onClose={() => setCheckAlert('')}
        >
          {checkAlert}
        </Alert>
      )}

      {/* 质量检查报告 */}
      <Card sx={{ mb: 3 }}>
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            质量检查报告
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleTriggerCheck}
            disabled={checkTriggering}
            startIcon={
              checkTriggering ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="solar:shield-check-bold" />
              )
            }
          >
            {checkTriggering ? '提交中...' : '手动触发检查'}
          </Button>
          <ToggleButtonGroup
            value={qualityDays}
            exclusive={true}
            size="small"
            onChange={handleDaysChange}
          >
            <ToggleButton value={7}>7天</ToggleButton>
            <ToggleButton value={14}>14天</ToggleButton>
            <ToggleButton value={30}>30天</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <DataQualityReportTable rows={qualityReport} loading={reportLoading} days={qualityDays} />
      </Card>

      {/* 数据缺口查询 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            数据缺口查询
          </Typography>
          <DataGapsPanel />
        </Box>
      </Card>

      {/* 校验异常日志 */}
      <Card>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            校验异常日志（最近 100 条）
          </Typography>
        </Box>
        <Divider />
        <ValidationLogTable rows={validationLogs} loading={validationLoading} />
      </Card>
    </Box>
  );
}
