import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import type { AgentRunProjection } from '../state/agent-state.types';

type FailureDiagnostics = NonNullable<AgentRunProjection['failureDiagnostics']>;

type ModelFailureDiagnosticsProps = {
  runId: string;
  modelName: string | null;
  errorCode: number | null | undefined;
  errorMessage: string;
  diagnostics?: FailureDiagnostics | null;
  recommendedActions?: string[];
};

export function ModelFailureDiagnostics({
  runId,
  modelName,
  errorCode,
  errorMessage,
  diagnostics,
  recommendedActions = [],
}: ModelFailureDiagnosticsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const rows = useMemo(
    () => [
      ['模型', diagnostics?.model ?? modelName ?? '—'],
      ['Provider', diagnostics?.provider ?? '—'],
      ['HTTP 状态', diagnostics?.httpStatus == null ? '—' : String(diagnostics.httpStatus)],
      ['错误类型', diagnostics?.errorClass ?? '—'],
      ['Run ID', runId],
      ['Trace ID', diagnostics?.traceId ?? '—'],
      ['Model Call ID', diagnostics?.modelCallId ?? '—'],
      ['上游请求 ID', diagnostics?.providerRequestId ?? '—'],
      [
        '配置最大输出',
        diagnostics?.configuredMaxOutputTokens == null
          ? '—'
          : `${diagnostics.configuredMaxOutputTokens} Token`,
      ],
      [
        '配置重试次数',
        diagnostics?.configuredMaxRetries == null ? '—' : String(diagnostics.configuredMaxRetries),
      ],
      [
        '失败轮 transport 尝试',
        diagnostics?.transportAttempts == null ? '—' : String(diagnostics.transportAttempts),
      ],
      ['已开始逻辑调用', diagnostics == null ? '—' : String(diagnostics.providerInvocations)],
      ['发生时间', diagnostics?.finishedAt ? fDateTime(diagnostics.finishedAt) : '—'],
    ],
    [diagnostics, modelName, runId]
  );
  const copyDiagnostics = useCallback(async () => {
    const text = [
      errorCode == null ? null : `错误码: ${errorCode}`,
      `错误信息: ${errorMessage}`,
      ...recommendedActions.map((action, index) => `处理建议 ${index + 1}: ${action}`),
      ...rows.map(([label, value]) => `${label}: ${value}`),
    ]
      .filter(Boolean)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }, [errorCode, errorMessage, recommendedActions, rows]);

  return (
    <Box sx={{ mt: 1 }}>
      {recommendedActions.length > 0 ? (
        <Box component="ul" sx={{ mt: 0.75, mb: 0.5, pl: 2.5 }}>
          {recommendedActions.map((action) => (
            <Typography key={action} component="li" variant="caption" sx={{ mb: 0.25 }}>
              {action}
            </Typography>
          ))}
        </Box>
      ) : null}
      <Button
        size="small"
        color="inherit"
        aria-expanded={expanded}
        aria-controls={`failure-diagnostics-${runId}`}
        onClick={() => setExpanded((value) => !value)}
        startIcon={
          <Iconify icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} />
        }
      >
        {expanded ? '收起诊断详情' : '查看诊断详情'}
      </Button>
      <Collapse in={expanded}>
        <Box
          id={`failure-diagnostics-${runId}`}
          component="dl"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'max-content minmax(0, 1fr)',
            columnGap: 2,
            rowGap: 0.75,
            mt: 1,
            mb: 0,
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          {rows.map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
                {label}
              </Typography>
              <Typography
                component="dd"
                variant="caption"
                sx={{ m: 0, overflowWrap: 'anywhere', fontFamily: 'monospace' }}
              >
                {value}
              </Typography>
            </Box>
          ))}
          <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
            <Button
              size="small"
              color="inherit"
              onClick={() => void copyDiagnostics()}
              startIcon={<Iconify icon={copied ? 'eva:checkmark-fill' : 'solar:copy-bold'} />}
              aria-label="复制诊断信息"
            >
              {copied ? '已复制' : '复制诊断信息'}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
