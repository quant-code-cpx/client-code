import type { AgentRequest, AgentResponse } from 'src/api/agent';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { fDateTime } from 'src/utils/format-time';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown/markdown';

import { AgentReportContent } from './agent-report-content';

type ResearchReportJournal = NonNullable<AgentRequest<'/agent/reports/save'>['journal']>;
type ResearchReportPreview = NonNullable<AgentResponse<'/agent/reports/save'>['preview']>;
type SavedResearchReport = NonNullable<AgentResponse<'/agent/reports/save'>['report']>;

type JournalForm = {
  tsCode: string;
  thesis: string;
  risks: string;
  decision: string;
  outcome: string;
  reviewAt: string;
};

const EMPTY_JOURNAL: JournalForm = {
  tsCode: '',
  thesis: '',
  risks: '',
  decision: '',
  outcome: '',
  reviewAt: '',
};

type AgentReportPreviewDialogProps = {
  open: boolean;
  runId: string | null;
  onClose: () => void;
  onSaved: (report: SavedResearchReport) => void;
};

function journalPayload(form: JournalForm): ResearchReportJournal | undefined {
  const risks = form.risks
    .split('\n')
    .map((risk) => risk.trim())
    .filter(Boolean);
  const reviewAt = form.reviewAt ? new Date(form.reviewAt) : null;
  const payload = {
    ...(form.tsCode.trim() ? { tsCode: form.tsCode.trim().toUpperCase() } : {}),
    ...(form.thesis.trim() ? { thesis: form.thesis.trim() } : {}),
    ...(risks.length > 0 ? { risks } : {}),
    ...(form.decision.trim() ? { decision: form.decision.trim() } : {}),
    ...(form.outcome.trim() ? { outcome: form.outcome.trim() } : {}),
    ...(reviewAt && !Number.isNaN(reviewAt.getTime()) ? { reviewAt: reviewAt.toISOString() } : {}),
  };
  return Object.keys(payload).length > 0 ? payload : undefined;
}

function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function presentationTitle(value: string): string {
  return value
    .replace(/\*\*|__|`/g, '')
    .replace(/^#+\s*/, '')
    .trim();
}

export function AgentReportPreviewDialog({ open, runId, onClose, onSaved }: AgentReportPreviewDialogProps) {
  const [preview, setPreview] = useState<ResearchReportPreview | null>(null);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [journal, setJournal] = useState<JournalForm>(EMPTY_JOURNAL);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRequestIdRef = useRef<string | null>(null);

  const currentJournal = useMemo(() => journalPayload(journal), [journal]);

  const loadPreview = useCallback(
    async (
      nextJournal: ResearchReportJournal | undefined,
      nextTitleOverride: string | null,
      resetDirty: boolean
    ) => {
      if (!runId) return;
      const normalizedTitle = nextTitleOverride === null ? null : nextTitleOverride.trim();
      if (normalizedTitle !== null && !normalizedTitle) {
        setError('报告标题不能为空');
        return;
      }
      setLoadingPreview(true);
      setError(null);
      try {
        const response = await agentApi.saveReport({
          runId,
          ...(normalizedTitle !== null ? { title: normalizedTitle } : {}),
          ...(nextJournal ? { journal: nextJournal } : {}),
        });
        if (!response.requiresConfirmation || !response.preview || !response.confirmationToken) {
          throw new Error('报告预览响应不完整，请重试');
        }
        setPreview(response.preview);
        setConfirmationToken(response.confirmationToken);
        setTitleOverride(normalizedTitle);
        clientRequestIdRef.current = null;
        if (resetDirty) setPreviewDirty(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '加载报告预览失败');
      } finally {
        setLoadingPreview(false);
      }
    },
    [runId]
  );

  useEffect(() => {
    if (!open || !runId) return;
    setPreview(null);
    setConfirmationToken(null);
    setTitleOverride(null);
    setJournal(EMPTY_JOURNAL);
    setPreviewDirty(false);
    clientRequestIdRef.current = null;
    void loadPreview(undefined, null, true);
  }, [loadPreview, open, runId]);

  const updateJournal = useCallback((key: keyof JournalForm, value: string) => {
    setJournal((current) => ({ ...current, [key]: value }));
    setPreviewDirty(true);
  }, []);

  const updateTitle = useCallback((value: string) => {
    setTitleOverride(value);
    setPreviewDirty(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmationToken || !preview || previewDirty) return;
    setSaving(true);
    setError(null);
    try {
      const clientRequestId = clientRequestIdRef.current ?? createClientRequestId();
      clientRequestIdRef.current = clientRequestId;
      const response = await agentApi.saveReport({
        confirmationToken,
        clientRequestId,
        ...(titleOverride !== null ? { title: titleOverride } : {}),
        ...(currentJournal ? { journal: currentJournal } : {}),
      });
      if (response.requiresConfirmation || !response.report) throw new Error('报告保存响应不完整，请重试');
      onSaved(response.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存研究报告失败');
    } finally {
      setSaving(false);
    }
  }, [confirmationToken, currentJournal, onSaved, preview, previewDirty, titleOverride]);

  const titleInvalid = titleOverride !== null && !titleOverride.trim();
  const canConfirm = Boolean(preview && confirmationToken && !previewDirty && !loadingPreview && !saving);

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="xl"
      aria-labelledby="agent-report-preview-title"
      slotProps={{
        paper: {
          sx: {
            height: { md: 'min(820px, calc(100dvh - 64px))' },
            color: 'text.primary',
            bgcolor: 'background.default',
            backgroundImage: 'none',
            overflow: 'hidden',
            overscrollBehavior: 'contain',
          },
        },
      }}
    >
      <DialogTitle component="div" id="agent-report-preview-title">
        <Typography variant="caption" sx={{ color: 'primary.light', letterSpacing: 1 }}>
          RESEARCH REPORTS
        </Typography>
        <Typography variant="h6">保存研究报告</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {loadingPreview ? (
          <Box sx={{ display: 'grid', minHeight: 220, placeItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">正在整理报告预览…</Typography>
          </Box>
        ) : null}

        {preview ? (
          <Box
            sx={{
              minHeight: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.7fr) 340px' },
            }}
          >
            <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.default' }}>
            <Typography variant="caption" sx={{ color: 'primary.light', letterSpacing: 0.8 }}>
              QUANTDESK RESEARCH
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700, textWrap: 'balance' }}>
              {presentationTitle(preview.title)}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
              <Chip
                size="small"
                label={`数据截止 ${preview.dataAsOf ?? '未标注'}`}
              />
              <Chip
                size="small"
                icon={<Iconify icon="solar:document-text-bold" width={15} />}
                label={`${preview.citations.length} 条引用`}
              />
              <Chip size="small" label={`确认截止 ${fDateTime(preview.confirmationExpiresAt)}`} />
            </Box>
            <Box sx={{ mb: 2, color: 'text.secondary', '& p': { m: 0 } }}>
              <Markdown>{preview.summary}</Markdown>
            </Box>
            <Box
              sx={{
                minHeight: 420,
                p: 3,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                bgcolor: 'background.paper',
              }}
            >
              <AgentReportContent
                messageId={preview.messageId}
                runId={preview.runId}
                contentBlocks={preview.contentBlocks}
                citations={preview.citations}
              />
            </Box>
            </Box>

            <Box
              component="aside"
              aria-label="报告保存设置"
              sx={{ p: 3, borderLeft: { md: 1 }, borderColor: 'divider' }}
            >
            <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 700 }}>
              保存设置
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
              标题、引用与数据口径随报告保留；投资日志可选。
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
              <TextField
                label="报告标题"
                value={titleOverride ?? presentationTitle(preview.title)}
                onChange={(event) => updateTitle(event.target.value)}
                error={titleInvalid}
                helperText={titleInvalid ? '报告标题不能为空' : '最多 200 个字符'}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <TextField
                label="证券代码"
                value={journal.tsCode}
                onChange={(event) => updateJournal('tsCode', event.target.value)}
                fullWidth
              />
              <TextField
                label="复盘时间"
                type="datetime-local"
                value={journal.reviewAt}
                onChange={(event) => updateJournal('reviewAt', event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="投资判断"
                value={journal.thesis}
                onChange={(event) => updateJournal('thesis', event.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
              <TextField
                label="主要风险（每行一项）"
                value={journal.risks}
                onChange={(event) => updateJournal('risks', event.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
              <TextField
                label="决策"
                value={journal.decision}
                onChange={(event) => updateJournal('decision', event.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
              <TextField
                label="复盘结果"
                value={journal.outcome}
                onChange={(event) => updateJournal('outcome', event.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
            </Box>
            {previewDirty ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                报告标题或投资日志已修改，请先更新预览再确认保存。
              </Alert>
            ) : null}
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>取消</Button>
        {previewDirty ? (
          <Button
            variant="outlined"
            onClick={() => void loadPreview(currentJournal, titleOverride, true)}
            disabled={titleInvalid || loadingPreview || saving}
          >
            更新预览
          </Button>
        ) : null}
        <Button variant="contained" onClick={() => void handleConfirm()} disabled={!canConfirm} loading={saving}>
          确认保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
