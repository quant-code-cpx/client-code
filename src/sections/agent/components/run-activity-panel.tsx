import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';

import { toolDisplayLabel } from '../lib/evidence-display';

import type { AgentRunProjection } from '../state/agent-state.types';

type RunActivityPanelProps = {
  run: AgentRunProjection;
  startedAt: string;
  onContinue: () => void;
};

type ResearchDecisionPanelProps = {
  decision?: AgentRunProjection['planningDecision'];
  planSummary?: string;
  toolActivities?: AgentRunProjection['toolActivities'];
};

function toolActivityLabel(activity: NonNullable<AgentRunProjection['toolActivities']>[number]) {
  if (activity.status === 'RUNNING') return '正在获取';
  if (activity.status === 'FAILED') return activity.willRetry ? '失败，准备重试' : '获取失败';
  return '已获取';
}

function ResearchDecisionPanel({ decision, planSummary, toolActivities = [] }: ResearchDecisionPanelProps) {
  if (!decision && !planSummary && toolActivities.length === 0) return null;

  return (
    <Box
      aria-label="研究决策与证据"
      sx={{ mt: 1.25, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ px: 1.25, py: 0.75, bgcolor: 'background.paper' }}
      >
        <Iconify icon="solar:document-text-bold" width={16} aria-hidden="true" />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          研究决策与证据
        </Typography>
        <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.secondary' }}>
          公开决策，不是隐藏推理
        </Typography>
      </Stack>

      <Stack spacing={1.1} sx={{ px: 1.25, py: 1.1 }}>
        {decision ? (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              1. 为什么先查这些
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.65, overflowWrap: 'anywhere' }}>
              {decision.toolSelectionReason}
            </Typography>
            {decision.selectedTools.length ? (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                选用：{decision.selectedTools.map(toolDisplayLabel).join('、')}
                {decision.fallback ? '（安全回退）' : ''}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {planSummary ? (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              2. 准备如何回答
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.65, overflowWrap: 'anywhere' }}>
              {planSummary}
            </Typography>
            {decision?.plannedTools.length ? (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                计划执行：{decision.plannedTools.map(toolDisplayLabel).join('、')}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {toolActivities.length ? (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              3. 实际取得了什么
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {toolActivities.slice(-5).map((activity) => (
                <Box key={activity.toolCallId} sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                    {toolDisplayLabel(activity.toolName)} · {toolActivityLabel(activity)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: 'text.secondary', overflowWrap: 'anywhere' }}
                  >
                    {activity.status === 'FAILED'
                      ? activity.error?.message ?? '工具调用失败'
                      : activity.outputSummary ?? activity.inputSummary ?? '等待结果'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

function formatElapsed(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const minuteSeconds = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return hours > 0 ? `${String(hours).padStart(2, '0')}:${minuteSeconds}` : minuteSeconds;
}

function connectionLabel(connectionState: AgentRunProjection['connectionState']) {
  if (connectionState === 'CONNECTING') return '正在建立实时连接';
  if (connectionState === 'OPEN') return '实时连接正常';
  if (connectionState === 'RETRYING') return '连接中断，正在自动恢复';
  if (connectionState === 'PAUSED') return '实时连接已暂停';
  if (connectionState === 'FAILED') return '实时连接异常';
  if (connectionState === 'ABORTED') return '实时连接已结束';
  return '执行状态同步中';
}

function modelPurposeLabel(purpose: string) {
  if (purpose === 'PLAN') return '研究规划';
  if (purpose === 'SUMMARIZE') return '会话整理';
  if (purpose === 'VERIFY') return '结论核验';
  if (purpose === 'CLASSIFY') return '问题理解';
  if (purpose === 'SYNTHESIZE') return '结论生成';
  return purpose;
}

function modelPhaseLabel(
  phase: NonNullable<AgentRunProjection['modelDiagnostics']>[number]['phase']
) {
  if (phase === 'REQUEST_DISPATCHED') return '请求已发送';
  if (phase === 'FIRST_PROVIDER_CHUNK') return '已收到首段响应';
  if (phase === 'REASONING') return '深度分析中';
  if (phase === 'DRAFT_STREAMING') return '草稿生成中';
  if (phase === 'STRUCTURED_REPAIR') return '结构化修复中';
  if (phase === 'PROVIDER_COMPLETED') return '等待结构化校验';
  if (phase === 'COMPLETED') return '结构化校验通过';
  if (phase === 'FAILED') return '调用失败';
  return '调用已开始';
}

function modelDiagnosticDetail(
  diagnostic: NonNullable<AgentRunProjection['modelDiagnostics']>[number]
) {
  if (diagnostic.phase === 'REQUEST_DISPATCHED') {
    const countSource =
      diagnostic.inputTokenCountSource === 'OPENAI_INPUT_TOKENS_API'
        ? 'OpenAI 供应商计数'
        : diagnostic.inputTokenCountSource === 'ANTHROPIC_COUNT_TOKENS_API'
          ? 'Anthropic 供应商计数'
          : '本地保守估算';
    const guardrail =
      diagnostic.runMaxCumulativeInputTokens == null
        ? 'Run 累计输入护栏未启用'
        : `Run 累计输入 ${formatTokenCount(diagnostic.runInputTokensUsedBeforeCall)} / ${formatTokenCount(diagnostic.runMaxCumulativeInputTokens)}（${diagnostic.runInputGuardrailSource ?? '来源未知'}）`;
    return [
      `消息 ${diagnostic.messageCount ?? 0} 条 · 单次上下文窗口 ${formatTokenCount(diagnostic.contextWindow)} · 本次最大输出 ${formatTokenCount(diagnostic.maxOutputTokens)}`,
      `输入预检 ${formatTokenCount(diagnostic.estimatedInputTokens)}（${countSource}，安全余量 ${formatTokenCount(diagnostic.inputTokenSafetyMarginTokens)}）`,
      `${guardrail} · 最坏路径预留 ${formatTokenCount(diagnostic.runInputReservationTokens)}`,
    ].join('；');
  }
  if (diagnostic.phase === 'FIRST_PROVIDER_CHUNK')
    return `首段类型：${diagnostic.firstChunkType ?? '未知'}`;
  if (diagnostic.phase === 'STRUCTURED_REPAIR') return '上一轮结构化结果未通过校验，正在重新生成。';
  if (diagnostic.phase === 'PROVIDER_COMPLETED')
    return `供应商结束原因：${diagnostic.finishReason ?? '未提供'}`;
  if (diagnostic.phase === 'COMPLETED') {
    const usage = diagnostic.usage;
    const usageSource =
      diagnostic.usageSource === 'PREFLIGHT_ESTIMATE' ? '缺少供应商 usage，按预检估算记账' : '供应商真实 usage';
    const warning = diagnostic.accountingWarnings?.length
      ? ` · ${diagnostic.accountingWarnings.join('；')}`
      : '';
    return `耗时 ${diagnostic.durationMs ?? 0} ms · 输入 ${formatTokenCount(usage?.inputTokens)} · 输出 ${formatTokenCount(usage?.outputTokens)} · ${usageSource}${diagnostic.repaired ? ' · 已修复一次' : ''}${warning}`;
  }
  if (diagnostic.phase === 'FAILED') {
    return `${diagnostic.error?.message ?? '模型调用失败'}${diagnostic.willFallback ? ' · 将切换模型重试' : ''}`;
  }
  return `第 ${diagnostic.attempt} 次调用`;
}

function formatTokenCount(value: number | null | undefined) {
  return (value ?? 0).toLocaleString('zh-CN');
}

export function RunActivityPanel({ run, startedAt, onContinue }: RunActivityPanelProps) {
  const [fallbackStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const parsedStartedAt = Date.parse(startedAt);
  const startedAtMs = Number.isFinite(parsedStartedAt) ? parsedStartedAt : fallbackStartedAt;
  const elapsedSeconds = Math.floor((now - startedAtMs) / 1000);
  const hasTotal = typeof run.progress?.total === 'number' && run.progress.total > 0;
  const progressValue = hasTotal
    ? Math.min(100, (run.progress!.completed / run.progress!.total!) * 100)
    : null;
  const liveConnection = run.connectionState === 'OPEN';

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [startedAtMs]);

  return (
    <Box
      aria-label="实时执行进度"
      sx={{
        mb: 2,
        p: 1.75,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Iconify
          icon="solar:pulse-2-bold-duotone"
          width={18}
          aria-hidden="true"
          sx={{ color: 'info.main' }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          实时执行进度
        </Typography>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          aria-hidden="true"
          sx={{ ml: 'auto !important', color: 'text.disabled' }}
        >
          <Iconify icon="solar:clock-circle-outline" width={14} aria-hidden="true" />
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            已用时 {formatElapsed(elapsedSeconds)}
          </Typography>
        </Stack>
      </Stack>

      <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
        {run.stageLabel}
      </Typography>
      {run.planningDecision || run.planSummary || run.toolActivities?.length ? (
        <ResearchDecisionPanel
          decision={run.planningDecision}
          planSummary={run.planSummary}
          toolActivities={run.toolActivities}
        />
      ) : (
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          执行过程会持续更新，研究完成后将自动显示正文。
        </Typography>
      )}

      {run.modelActivity ? (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ mt: 1, color: 'info.main' }}
        >
          <Iconify icon="solar:shield-check-bold" width={16} aria-hidden="true" />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            模型正在处理当前步骤；完成后会补充公开决策或数据结果
          </Typography>
        </Stack>
      ) : null}

      {run.modelDiagnostics?.length ? (
        <Box
          aria-label="模型调用技术明细"
          sx={{ mt: 1.25, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ px: 1.25, py: 0.75, bgcolor: 'background.paper' }}
          >
            <Iconify icon="solar:document-text-bold" width={16} aria-hidden="true" />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              模型调用技术明细
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.secondary' }}>
              排查模型问题用
            </Typography>
          </Stack>
          <Stack spacing={0.75} sx={{ px: 1.25, py: 1 }}>
            {run.modelDiagnostics.slice(-6).map((diagnostic) => (
              <Box key={diagnostic.modelCallId} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap">
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {modelPurposeLabel(diagnostic.purpose)} · {diagnostic.model}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        diagnostic.status === 'FAILED'
                          ? 'error.main'
                          : diagnostic.status === 'COMPLETED'
                            ? 'success.main'
                            : 'info.main',
                    }}
                  >
                    {modelPhaseLabel(diagnostic.phase)}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', overflowWrap: 'anywhere' }}
                >
                  {modelDiagnosticDetail(diagnostic)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {run.draftPreview?.text ? (
        <Box
          aria-label="答案草稿预览"
          sx={{ mt: 1.25, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ px: 1.25, py: 0.75, bgcolor: 'background.paper' }}
          >
            <Iconify icon="solar:document-text-bold" width={16} aria-hidden="true" />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              答案草稿（引用校验前）
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.secondary' }}>
              实时生成
            </Typography>
          </Stack>
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            <Typography
              variant="body2"
              sx={{
                px: 1.25,
                py: 1,
                color: 'text.secondary',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {run.draftPreview.text}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <LinearProgress
        variant={progressValue === null ? 'indeterminate' : 'determinate'}
        value={progressValue ?? undefined}
        aria-label={run.progress?.label ?? 'Agent 执行进度'}
        sx={{
          mt: 1.5,
          height: 4,
          borderRadius: 2,
          '@media (prefers-reduced-motion: reduce)': {
            '& .MuiLinearProgress-bar': { animation: 'none' },
          },
        }}
      />

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: liveConnection ? 'success.main' : 'warning.main',
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: run.connectionState === 'RETRYING' ? 'warning.main' : 'text.secondary',
          }}
        >
          {connectionLabel(run.connectionState)}
        </Typography>
        {run.progress ? (
          <Typography
            variant="caption"
            sx={{
              ml: 'auto !important',
              color: 'text.secondary',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {run.progress.label} · {run.progress.completed}
            {run.progress.total ? ` / ${run.progress.total}` : ''}
          </Typography>
        ) : null}
        {run.connectionState === 'PAUSED' ? (
          <Button size="small" onClick={onContinue} sx={{ ml: 'auto !important' }}>
            继续接收
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
