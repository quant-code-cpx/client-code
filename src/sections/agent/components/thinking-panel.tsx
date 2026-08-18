import type { ScrollerProps, VirtuosoHandle } from 'react-virtuoso';

import { Virtuoso } from 'react-virtuoso';
import {
  useRef,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useCallback,
  useLayoutEffect,
} from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from 'src/components/iconify';

import { ToolCallCard } from './tool-call-card';
import { toolDisplayLabel } from '../lib/evidence-display';
import { useAgentRunEvents } from '../hooks/use-agent-run-events';
import { useAgentToolCalls } from '../hooks/use-agent-tool-calls';
import { isAgentThinkingEvent, isAgentReasoningDeltaEvent } from '../state/agent-state.types';

import type {
  AgentRunEvent,
  AgentToolActivity,
  AgentRunProjection,
  AgentMessageEntity,
} from '../state/agent-state.types';

const TIMELINE_VIRTUALIZATION_THRESHOLD = 80;
const TIMELINE_VIRTUALIZATION_CHARACTER_THRESHOLD = 128 * 1024;
const TOOL_VIRTUALIZATION_THRESHOLD = 40;
const MAX_REASONING_ROW_CHARACTERS = 32 * 1024;

type ThinkingPanelProps = {
  runId: string;
  statusVersion: number | null | undefined;
  messageStatus: AgentMessageEntity['status'];
  run: AgentRunProjection | null;
  onContinue: () => void;
};

type ReasoningBlock = {
  key: string;
  modelCallId: string;
  attempt: number;
  kind: 'FULL' | 'SUMMARY';
  text: string;
  firstSequence: number;
  lastSequence: number;
  occurredAt: string;
  continuation: boolean;
};

type TimelineEntry =
  | { type: 'REASONING'; key: string; sequence: number; block: ReasoningBlock }
  | { type: 'EVENT'; key: string; sequence: number; event: AgentRunEvent };

type ReasoningDraft = Omit<ReasoningBlock, 'text'> & {
  parts: string[];
  characterCount: number;
};

type TimelineDraftEntry =
  | { type: 'REASONING'; key: string; sequence: number; block: ReasoningDraft }
  | { type: 'EVENT'; key: string; sequence: number; event: AgentRunEvent };

type ToolTraceEntry =
  | { type: 'LIVE'; key: string; activity: AgentToolActivity }
  | { type: 'PERSISTED'; key: string; toolCall: Parameters<typeof ToolCallCard>[0]['toolCall'] };

type TimelineScrollerContext = {
  onManualScrollAway: () => void;
};

function codePointSafeSliceEnd(text: string, start: number, capacity: number) {
  let end = Math.min(text.length, start + capacity);
  if (end >= text.length || end <= start) return end;

  const previousCodeUnit = text.charCodeAt(end - 1);
  const nextCodeUnit = text.charCodeAt(end);
  const splitsSurrogatePair =
    previousCodeUnit >= 0xd800 &&
    previousCodeUnit <= 0xdbff &&
    nextCodeUnit >= 0xdc00 &&
    nextCodeUnit <= 0xdfff;
  if (splitsSurrogatePair) end -= 1;
  return end;
}

function timelineEntries(events: AgentRunEvent[]): TimelineEntry[] {
  const entries: TimelineDraftEntry[] = [];
  const orderedEvents = events.some(
    (event, index) => index > 0 && event.sequence < events[index - 1]!.sequence
  )
    ? [...events].sort((left, right) => left.sequence - right.sequence)
    : events;

  orderedEvents.forEach((event) => {
    if (isAgentReasoningDeltaEvent(event)) {
      const groupingKey = `${event.payload.modelCallId}:${event.payload.attempt}:${event.payload.kind}`;
      let offset = 0;
      while (offset < event.payload.delta.length) {
        const previous = entries.at(-1);
        const canAppend =
          previous?.type === 'REASONING' &&
          previous.block.key === groupingKey &&
          previous.block.characterCount < MAX_REASONING_ROW_CHARACTERS;
        let targetBlock = canAppend ? previous : null;
        let remainingCapacity = canAppend
          ? MAX_REASONING_ROW_CHARACTERS - previous.block.characterCount
          : MAX_REASONING_ROW_CHARACTERS;
        let end = codePointSafeSliceEnd(event.payload.delta, offset, remainingCapacity);

        if (end === offset && targetBlock) {
          targetBlock = null;
          remainingCapacity = MAX_REASONING_ROW_CHARACTERS;
          end = codePointSafeSliceEnd(event.payload.delta, offset, remainingCapacity);
        }
        const part = event.payload.delta.slice(offset, end);

        if (targetBlock?.type === 'REASONING') {
          targetBlock.block.parts.push(part);
          targetBlock.block.characterCount += part.length;
          targetBlock.block.lastSequence = event.sequence;
        } else {
          const continuation = previous?.type === 'REASONING' && previous.block.key === groupingKey;
          entries.push({
            type: 'REASONING',
            key: `reasoning:${event.eventId}:${offset}`,
            sequence: event.sequence,
            block: {
              key: groupingKey,
              modelCallId: event.payload.modelCallId,
              attempt: event.payload.attempt,
              kind: event.payload.kind,
              parts: [part],
              characterCount: part.length,
              firstSequence: event.sequence,
              lastSequence: event.sequence,
              occurredAt: event.occurredAt,
              continuation,
            },
          });
        }
        offset += part.length;
      }
      return;
    }
    if (isAgentThinkingEvent(event)) {
      entries.push({ type: 'EVENT', key: event.eventId, sequence: event.sequence, event });
    }
  });

  return entries.map((entry) =>
    entry.type === 'REASONING'
      ? {
          ...entry,
          block: {
            ...entry.block,
            text: entry.block.parts.join(''),
          },
        }
      : entry
  );
}

function modelLabels(events: AgentRunEvent[]): Map<string, string> {
  const labels = new Map<string, string>();
  events.forEach((event) => {
    if (event.type === 'model.started') {
      labels.set(event.payload.modelCallId, `${event.payload.model} · ${event.payload.provider}`);
    }
  });
  return labels;
}

function toolNames(events: AgentRunEvent[]): Map<string, string> {
  const names = new Map<string, string>();
  events.forEach((event) => {
    if (event.type === 'tool.started') {
      names.set(
        event.payload.toolCallId,
        toolDisplayLabel(event.payload.toolName, event.payload.toolDisplayName)
      );
    }
  });
  return names;
}

function TimelineEvent({
  event,
  names,
  labels,
}: {
  event: AgentRunEvent;
  names: Map<string, string>;
  labels: Map<string, string>;
}) {
  if (event.type === 'agent.started') {
    return (
      <>
        <b>开始执行</b>
        <br />
        {event.payload.workflowKey} · v{event.payload.workflowVersion}
      </>
    );
  }
  if (event.type === 'agent.planning') {
    return (
      <>
        <b>研究计划</b>
        <br />
        {event.payload.planSummary}
        {event.payload.decision?.toolSelectionReason ? (
          <>
            <br />
            <Box component="span" sx={{ color: 'text.secondary' }}>
              工具选择：{event.payload.decision.toolSelectionReason}
            </Box>
          </>
        ) : null}
      </>
    );
  }
  if (event.type === 'agent.progress') {
    return (
      <>
        <b>{event.payload.label}</b>
        <br />
        {event.payload.total === null
          ? `已完成 ${event.payload.completed}`
          : `${event.payload.completed} / ${event.payload.total}`}
      </>
    );
  }
  if (event.type === 'context.compaction.started') {
    return (
      <>
        <b>整理历史上下文</b>
        <br />
        {event.payload.model} · {event.payload.estimatedTokens} → {event.payload.targetTokens}{' '}
        tokens
      </>
    );
  }
  if (event.type === 'context.compaction.completed') {
    return (
      <>
        <b>历史上下文整理完成</b>
        <br />
        {event.payload.sourceMessageCount} 条消息 · {event.payload.sourceTokenCount} tokens
      </>
    );
  }
  if (event.type === 'context.compaction.failed') {
    return (
      <>
        <b>历史上下文整理失败</b>
        <br />
        {event.payload.message}
      </>
    );
  }
  if (event.type === 'model.started') {
    return (
      <>
        <b>开始模型调用</b>
        <br />
        {event.payload.model} · {event.payload.provider}
      </>
    );
  }
  if (event.type === 'model.trace') {
    const model = labels.get(event.payload.modelCallId) ?? event.payload.modelCallId;
    if (event.payload.phase === 'REQUEST_DISPATCHED') {
      return (
        <>
          <b>模型请求已发送</b>
          <br />
          {model} · {event.payload.estimatedInputTokens} input tokens · 最多{' '}
          {event.payload.maxOutputTokens} output tokens
        </>
      );
    }
    if (event.payload.phase === 'FIRST_PROVIDER_CHUNK') {
      return (
        <>
          <b>模型开始返回</b>
          <br />
          {model} · {event.payload.chunkType}
        </>
      );
    }
    if (event.payload.phase === 'STRUCTURED_REPAIR') {
      return <b>正在修复模型输出格式</b>;
    }
    return (
      <>
        <b>供应商流已完成</b>
        <br />
        {model} · {event.payload.finishReason ?? 'completed'}
      </>
    );
  }
  if (event.type === 'model.fallback') {
    return (
      <>
        <b>切换模型</b>
        <br />
        {event.payload.fromModel} → {event.payload.toModel}
      </>
    );
  }
  if (event.type === 'model.completed') {
    return (
      <>
        <b>模型调用完成</b>
        <br />
        {event.payload.model} · {event.payload.durationMs} ms
      </>
    );
  }
  if (event.type === 'model.failed') {
    return (
      <>
        <b>模型调用失败</b>
        <br />
        {event.payload.error.message}
      </>
    );
  }
  if (event.type === 'tool.started') {
    return (
      <>
        <b>
          调用工具 · {toolDisplayLabel(event.payload.toolName, event.payload.toolDisplayName)}
        </b>
        <br />
        {event.payload.inputSummary}
      </>
    );
  }
  if (event.type === 'tool.completed') {
    return (
      <>
        <b>工具完成 · {names.get(event.payload.toolCallId) ?? event.payload.toolCallId}</b>
        <br />
        {event.payload.outputSummary}
      </>
    );
  }
  if (event.type === 'tool.failed') {
    return (
      <>
        <b>工具失败 · {names.get(event.payload.toolCallId) ?? event.payload.toolCallId}</b>
        <br />
        {event.payload.error.message}
      </>
    );
  }
  return null;
}

function LiveToolActivity({ activity }: { activity: AgentToolActivity }) {
  const status =
    activity.status === 'RUNNING'
      ? '正在执行'
      : activity.status === 'FAILED'
        ? activity.willRetry
          ? '失败，准备重试'
          : '执行失败'
        : '执行完成';

  return (
    <Box
      sx={{ py: 1, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
        <Iconify icon="solar:settings-bold-duotone" width={17} sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle2">
          {toolDisplayLabel(activity.toolName, activity.toolDisplayName)}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: activity.status === 'FAILED' ? 'error.main' : 'text.secondary' }}
        >
          {status}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.25, color: 'text.secondary', overflowWrap: 'anywhere' }}
      >
        {activity.status === 'FAILED'
          ? (activity.error?.message ?? '工具调用失败')
          : (activity.outputSummary ?? activity.inputSummary ?? '等待结果')}
      </Typography>
    </Box>
  );
}

function toolCallStatus(activity: AgentToolActivity) {
  if (activity.status === 'RUNNING') return 'RUNNING' as const;
  if (activity.status === 'COMPLETED') return 'SUCCEEDED' as const;
  return activity.willRetry ? ('RETRY_WAIT' as const) : ('FAILED' as const);
}

function TimelineRow({
  entry,
  names,
  labels,
}: {
  entry: TimelineEntry;
  names: Map<string, string>;
  labels: Map<string, string>;
}) {
  return (
    <Box
      data-testid="thinking-timeline-row"
      sx={{
        py: 0.75,
        position: 'relative',
        contentVisibility: 'auto',
        containIntrinsicSize: '0 88px',
        '&::before': {
          top: 14,
          left: -21,
          width: 7,
          height: 7,
          content: '""',
          borderRadius: '50%',
          position: 'absolute',
          bgcolor: entry.type === 'REASONING' ? 'info.main' : 'text.disabled',
          boxShadow: (theme) => `0 0 0 3px ${theme.palette.background.default}`,
        },
      }}
    >
      {entry.type === 'REASONING' ? (
        <>
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {entry.block.kind === 'FULL' ? '思考' : '思考摘要'}
              {entry.block.continuation ? '（续）' : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {labels.get(entry.block.modelCallId) ?? entry.block.modelCallId} · 第{' '}
              {entry.block.attempt} 次
            </Typography>
          </Stack>
          <Typography
            component="div"
            variant="body2"
            data-testid="thinking-reasoning-text"
            sx={{ mt: 0.75, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          >
            {entry.block.text}
          </Typography>
        </>
      ) : (
        <Typography
          component="div"
          variant="body2"
          sx={{ lineHeight: 1.65, overflowWrap: 'anywhere' }}
        >
          <TimelineEvent event={entry.event} names={names} labels={labels} />
        </Typography>
      )}
    </Box>
  );
}

const TimelineScroller = forwardRef<
  HTMLDivElement,
  ScrollerProps & { context: TimelineScrollerContext }
>(({ context, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    role="log"
    aria-label="模型思考与工具轨迹"
    aria-live="off"
    tabIndex={0}
    onWheel={(event) => {
      if (event.deltaY < 0) context.onManualScrollAway();
    }}
    onKeyDown={(event) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) context.onManualScrollAway();
    }}
    onPointerDown={(event) => {
      if (event.target === event.currentTarget) context.onManualScrollAway();
    }}
    style={{ ...props.style, overscrollBehavior: 'contain' }}
  />
));
TimelineScroller.displayName = 'TimelineScroller';

const ToolScroller = forwardRef<HTMLDivElement, ScrollerProps>((props, ref) => (
  <div
    {...props}
    ref={ref}
    role="list"
    aria-label="完整工具调用记录"
    tabIndex={0}
    style={{ ...props.style, overscrollBehavior: 'contain' }}
  />
));
ToolScroller.displayName = 'ToolScroller';

const TIMELINE_VIRTUOSO_COMPONENTS = { Scroller: TimelineScroller };
const TOOL_VIRTUOSO_COMPONENTS = { Scroller: ToolScroller };

function ToolTraceRow({
  entry,
  expanded,
  onExpandedChange,
}: {
  entry: ToolTraceEntry;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  return (
    <Box role="listitem" data-testid="thinking-tool-row">
      {entry.type === 'LIVE' ? (
        <LiveToolActivity activity={entry.activity} />
      ) : (
        <ToolCallCard
          toolCall={entry.toolCall}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        />
      )}
    </Box>
  );
}

export function ThinkingPanel({
  runId,
  statusVersion,
  messageStatus,
  run,
  onContinue,
}: ThinkingPanelProps) {
  const running = messageStatus === 'PENDING' || messageStatus === 'STREAMING';
  const [expanded, setExpanded] = useState(running);
  const [expandedToolIds, setExpandedToolIds] = useState<Set<string>>(() => new Set());
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineVirtuosoRef = useRef<VirtuosoHandle>(null);
  const followLatestRef = useRef(true);
  const timelineScrollerContext = useMemo<TimelineScrollerContext>(
    () => ({
      onManualScrollAway: () => {
        followLatestRef.current = false;
      },
    }),
    []
  );
  const eventHistory = useAgentRunEvents(runId, statusVersion, expanded, run?.thinkingEvents);
  const toolCalls = useAgentToolCalls(runId, statusVersion, expanded);
  const timeline = useMemo(() => timelineEntries(eventHistory.items), [eventHistory.items]);
  const blocks = timeline.filter((entry) => entry.type === 'REASONING');
  const reasoningBlockCount = blocks.filter((entry) => !entry.block.continuation).length;
  const reasoningCharacterCount = blocks.reduce(
    (total, entry) => total + entry.block.text.length,
    0
  );
  const labels = useMemo(() => modelLabels(eventHistory.items), [eventHistory.items]);
  const names = useMemo(() => toolNames(eventHistory.items), [eventHistory.items]);
  const liveToolById = useMemo(
    () =>
      new Map(
        (running ? (run?.toolActivities ?? []) : []).map((activity) => [
          activity.toolCallId,
          activity,
        ])
      ),
    [run?.toolActivities, running]
  );
  const displayedToolCalls = useMemo(
    () =>
      toolCalls.items.map((item) => {
        const activity = liveToolById.get(item.toolCallId);
        if (!activity) return item;
        return {
          ...item,
          status: toolCallStatus(activity),
          attemptCount: Math.max(item.attemptCount, activity.attempt),
          inputSummary:
            Object.keys(item.inputSummary).length > 0 || !activity.inputSummary
              ? item.inputSummary
              : { summary: activity.inputSummary },
          outputSummary: activity.outputSummary
            ? {
                ...(item.outputSummary ?? {}),
                liveSummary: activity.outputSummary,
                ...(activity.rowCount == null ? {} : { rowCount: activity.rowCount }),
              }
            : item.outputSummary,
          durationMs: activity.durationMs ?? item.durationMs,
          errorCode: activity.status === 'FAILED' ? (activity.error?.code ?? item.errorCode) : null,
          errorMessage:
            activity.status === 'FAILED' ? (activity.error?.message ?? item.errorMessage) : null,
        };
      }),
    [liveToolById, toolCalls.items]
  );
  const persistedToolIds = useMemo(
    () => new Set(displayedToolCalls.map((item) => item.toolCallId)),
    [displayedToolCalls]
  );
  const liveTools = useMemo(
    () =>
      running
        ? (run?.toolActivities ?? []).filter(
            (activity) => !persistedToolIds.has(activity.toolCallId)
          )
        : [],
    [persistedToolIds, run?.toolActivities, running]
  );
  const toolEntries = useMemo<ToolTraceEntry[]>(
    () => [
      ...liveTools.map((activity) => ({
        type: 'LIVE' as const,
        key: `live:${activity.toolCallId}`,
        activity,
      })),
      ...displayedToolCalls.map((toolCall) => ({
        type: 'PERSISTED' as const,
        key: `persisted:${toolCall.toolCallId}`,
        toolCall,
      })),
    ],
    [displayedToolCalls, liveTools]
  );
  const virtualizeTimeline =
    timeline.length > TIMELINE_VIRTUALIZATION_THRESHOLD ||
    reasoningCharacterCount > TIMELINE_VIRTUALIZATION_CHARACTER_THRESHOLD;
  const virtualizeTools = toolEntries.length > TOOL_VIRTUALIZATION_THRESHOLD;
  const progressValue =
    run?.progress?.total && run.progress.total > 0
      ? Math.min(100, (run.progress.completed / run.progress.total) * 100)
      : null;

  useEffect(() => {
    if (running) setExpanded(true);
  }, [running]);

  useLayoutEffect(() => {
    const element = timelineRef.current;
    if (!running || !expanded || !followLatestRef.current) return;
    if (virtualizeTimeline) {
      timelineVirtuosoRef.current?.autoscrollToBottom();
      return;
    }
    if (element) element.scrollTop = element.scrollHeight;
  }, [expanded, running, timeline, virtualizeTimeline]);

  const handleToolExpandedChange = useCallback((key: string, value: boolean) => {
    setExpandedToolIds((current) => {
      if (current.has(key) === value) return current;
      const next = new Set(current);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_event, value) => setExpanded(value)}
      elevation={0}
      sx={{
        mb: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.25,
        bgcolor: 'background.default',
        '&::before': { display: 'none' },
        '&.Mui-expanded': { mb: 2 },
      }}
    >
      <AccordionSummary
        id={`thinking-${runId}-header`}
        aria-controls={`thinking-${runId}-content`}
        expandIcon={<Iconify icon="solar:alt-arrow-down-bold" width={16} />}
        sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, width: 1 }}>
          <Iconify
            icon={running ? 'solar:pulse-2-bold-duotone' : 'solar:history-bold'}
            width={18}
            sx={{ flexShrink: 0, color: running ? 'info.main' : 'text.secondary' }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {running ? '正在思考' : '思考过程'}
          </Typography>
          {running && run?.stageLabel ? (
            <Typography variant="caption" noWrap sx={{ minWidth: 0, color: 'text.secondary' }}>
              {run.stageLabel}
            </Typography>
          ) : null}
          {(blocks.length > 0 || toolCalls.items.length > 0 || liveTools.length > 0) && (
            <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.disabled' }}>
              {reasoningBlockCount} 段推理 · {toolCalls.items.length + liveTools.length} 个工具
            </Typography>
          )}
        </Stack>
      </AccordionSummary>

      <AccordionDetails id={`thinking-${runId}-content`} sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
        {progressValue !== null ? (
          <LinearProgress
            variant="determinate"
            value={progressValue}
            aria-label={run?.progress?.label ?? 'Agent 执行进度'}
            sx={{ mb: 1.25, height: 3, borderRadius: 2 }}
          />
        ) : null}

        {eventHistory.loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              加载完整思考历史…
            </Typography>
          </Stack>
        ) : null}
        {eventHistory.error ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {eventHistory.error}
          </Alert>
        ) : null}
        {eventHistory.partial ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            思考历史分页未能到达末页，已保留当前加载内容。
          </Alert>
        ) : null}

        {timeline.length > 0 && virtualizeTimeline ? (
          <Box
            sx={{
              ml: 0.75,
              pl: 2,
              pr: 0.5,
              borderLeft: 1,
              borderColor: 'divider',
            }}
          >
            <Virtuoso
              ref={timelineVirtuosoRef}
              data={timeline}
              components={TIMELINE_VIRTUOSO_COMPONENTS}
              context={timelineScrollerContext}
              computeItemKey={(_index, entry) => entry.key}
              initialTopMostItemIndex={running ? timeline.length - 1 : 0}
              atBottomThreshold={48}
              atBottomStateChange={(atBottom) => {
                if (atBottom) followLatestRef.current = true;
              }}
              followOutput={() => (running && followLatestRef.current ? 'auto' : false)}
              increaseViewportBy={{ top: 160, bottom: 240 }}
              defaultItemHeight={88}
              style={{ height: 420 }}
              itemContent={(_index, entry) => (
                <TimelineRow entry={entry} names={names} labels={labels} />
              )}
            />
          </Box>
        ) : timeline.length > 0 ? (
          <Stack
            ref={timelineRef}
            spacing={1}
            role="log"
            aria-label="模型思考与工具轨迹"
            aria-live="off"
            tabIndex={0}
            onScroll={(event) => {
              const element = event.currentTarget;
              followLatestRef.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            }}
            sx={{
              ml: 0.75,
              pl: 2,
              pr: 0.5,
              maxHeight: 420,
              overflowY: 'auto',
              borderLeft: 1,
              borderColor: 'divider',
              overscrollBehavior: 'contain',
            }}
          >
            {timeline.map((entry) => (
              <TimelineRow key={entry.key} entry={entry} names={names} labels={labels} />
            ))}
          </Stack>
        ) : !eventHistory.loading ? (
          <Typography variant="body2" sx={{ py: 0.75, color: 'text.secondary' }}>
            {running ? '等待模型返回思考正文…' : '本次运行未保存思考正文，字符计数无法还原为内容。'}
          </Typography>
        ) : null}
        {timeline.length > 0 && blocks.length === 0 && !eventHistory.loading ? (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.disabled' }}>
            {running ? '等待模型返回思考正文…' : '本次运行未保存思考正文，字符计数无法还原为内容。'}
          </Typography>
        ) : null}

        {run?.draftPreview?.text ? (
          <Box sx={{ mt: 1.25, p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              答案草稿（校验前）
            </Typography>
            <Typography
              component="div"
              variant="body2"
              sx={{
                mt: 0.5,
                maxHeight: 220,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
              }}
            >
              {run.draftPreview.text}
            </Typography>
          </Box>
        ) : null}

        <Box sx={{ mt: 1.25 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            相关工具调用
          </Typography>
          {toolCalls.loading && toolCalls.items.length === 0 ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                加载完整工具记录…
              </Typography>
            </Stack>
          ) : null}
          {toolCalls.error ? (
            <Alert severity="warning" sx={{ mt: 0.75 }}>
              {toolCalls.error}
            </Alert>
          ) : null}
          {toolCalls.partial ? (
            <Alert severity="warning" sx={{ mt: 0.75 }}>
              工具调用分页未能到达末页，已保留当前加载内容。
            </Alert>
          ) : null}
          {virtualizeTools ? (
            <Virtuoso
              data={toolEntries}
              components={TOOL_VIRTUOSO_COMPONENTS}
              computeItemKey={(_index, entry) => entry.key}
              increaseViewportBy={{ top: 160, bottom: 240 }}
              defaultItemHeight={64}
              style={{ height: 480 }}
              itemContent={(_index, entry) => (
                <ToolTraceRow
                  entry={entry}
                  expanded={expandedToolIds.has(entry.key)}
                  onExpandedChange={(value) => handleToolExpandedChange(entry.key, value)}
                />
              )}
            />
          ) : toolEntries.length > 0 ? (
            <Box role="list" aria-label="完整工具调用记录">
              {toolEntries.map((entry) => (
                <ToolTraceRow
                  key={entry.key}
                  entry={entry}
                  expanded={expandedToolIds.has(entry.key)}
                  onExpandedChange={(value) => handleToolExpandedChange(entry.key, value)}
                />
              ))}
            </Box>
          ) : null}
          {!toolCalls.loading && !toolCalls.error && toolEntries.length === 0 ? (
            <Typography
              variant="caption"
              sx={{ display: 'block', py: 0.75, color: 'text.disabled' }}
            >
              此次运行没有工具调用
            </Typography>
          ) : null}
        </Box>

        {run?.connectionState === 'PAUSED' ? (
          <Button size="small" onClick={onContinue} sx={{ mt: 1 }}>
            继续接收
          </Button>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}
