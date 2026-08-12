import type { LabelColor } from 'src/components/label/types';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAgentToolCalls } from '../hooks/use-agent-tool-calls';

import type { AgentToolCall } from '../hooks/use-agent-tool-calls';

const STATUS_LABELS: Record<AgentToolCall['status'], string> = {
  PENDING: '等待',
  AUTHORIZING: '授权检查',
  RUNNING: '执行中',
  RETRY_WAIT: '等待重试',
  SUCCEEDED: '成功',
  FAILED: '失败',
  CANCELLED: '已取消',
  REJECTED: '已拒绝',
};

function statusColor(status: AgentToolCall['status']): LabelColor {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED' || status === 'REJECTED') return 'error';
  if (status === 'CANCELLED' || status === 'RETRY_WAIT') return 'warning';
  return 'info';
}

function summaryEntries(summary: Record<string, unknown> | null | undefined) {
  if (!summary) return [];
  return Object.entries(summary)
    .slice(0, 10)
    .map(([key, value]) => {
      let display = '结构化摘要';
      if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
        display = String(value ?? '—').slice(0, 240);
      } else if (Array.isArray(value)) {
        display = `列表（${value.length} 项）`;
      }
      return { key, display };
    });
}

export function ToolCallCard({ toolCall }: { toolCall: AgentToolCall }) {
  const input = summaryEntries(toolCall.inputSummary);
  const output = summaryEntries(toolCall.outputSummary);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'transparent',
        '&::before': { display: 'none' },
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="solar:alt-arrow-down-bold" width={16} />}
        aria-controls={`tool-${toolCall.toolCallId}-content`}
        id={`tool-${toolCall.toolCallId}-header`}
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Iconify icon="solar:settings-bold-duotone" width={18} sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {toolCall.toolName}
          </Typography>
          <Label variant="soft" color={statusColor(toolCall.status)}>
            {STATUS_LABELS[toolCall.status]}
          </Label>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            第 {toolCall.attemptCount} 次尝试
          </Typography>
          {toolCall.durationMs != null ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {toolCall.durationMs} ms
            </Typography>
          ) : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails id={`tool-${toolCall.toolCallId}-content`}>
        <Stack spacing={1.5}>
          <SummarySection title="输入摘要" entries={input} />
          {output.length > 0 ? <SummarySection title="输出摘要" entries={output} /> : null}
          {toolCall.errorMessage ? <Alert severity="error">{toolCall.errorMessage}</Alert> : null}
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              开始 {fDateTime(toolCall.startedAt)}
            </Typography>
            {toolCall.dataAsOf ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                数据时点 {fDateTime(toolCall.dataAsOf)}
              </Typography>
            ) : null}
            {toolCall.dataThrough ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                数据截止 {fDateTime(toolCall.dataThrough)}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function SummarySection({
  title,
  entries,
}: {
  title: string;
  entries: Array<{ key: string; display: string }>;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {title}
      </Typography>
      {entries.length > 0 ? (
        <Stack component="dl" spacing={0.5} sx={{ m: 0, mt: 0.5 }}>
          {entries.map((entry) => (
            <Stack key={entry.key} direction="row" spacing={1}>
              <Typography
                component="dt"
                variant="caption"
                sx={{ minWidth: 100, color: 'text.disabled' }}
              >
                {entry.key}
              </Typography>
              <Typography component="dd" variant="caption" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                {entry.display}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
          无可展示摘要
        </Typography>
      )}
    </Box>
  );
}

type ToolCallListProps = {
  runId?: string | null;
  statusVersion?: number | null;
  enabled: boolean;
  defaultExpanded?: boolean;
};

export function ToolCallList({
  runId,
  statusVersion,
  enabled,
  defaultExpanded = false,
}: ToolCallListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);
  const { items, loading, error } = useAgentToolCalls(
    runId,
    statusVersion,
    enabled && expanded
  );
  if (!enabled || !runId) return null;

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      elevation={0}
      onChange={(_event, value) => setExpanded(value)}
      sx={{
        mt: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.25,
        bgcolor: 'background.default',
        '&::before': { display: 'none' },
        '&.Mui-expanded': { mt: 2 },
      }}
    >
      <AccordionSummary
        aria-label="查看 Tool 执行记录"
        expandIcon={<Iconify icon="solar:alt-arrow-down-bold" width={16} />}
      >
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Iconify icon="solar:settings-bold-duotone" width={18} sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            执行轨迹
          </Typography>
          {items.length > 0 ? (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {items.length} 条
            </Typography>
          ) : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails role="region" aria-label="Tool 执行记录" sx={{ pt: 0, px: 0 }}>
        {loading && items.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              加载 Tool 执行摘要…
            </Typography>
          </Stack>
        ) : null}
        {error ? <Alert severity="warning">{error}</Alert> : null}
        {!loading && !error && items.length === 0 ? (
          <Typography variant="caption" sx={{ display: 'block', py: 1, color: 'text.disabled' }}>
            此次 Run 无 Tool 执行记录
          </Typography>
        ) : null}
        {!loading && !error && items.length > 0 ? (
          <Stack spacing={0}>
            {items.map((item) => (
              <ToolCallCard key={item.toolCallId} toolCall={item} />
            ))}
          </Stack>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}
