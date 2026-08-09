import type { RefObject } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ToolAction =
  | { type: 'wrap'; before: string; after: string }
  | { type: 'linePrefix'; prefix: string }
  | { type: 'insert'; text: string };

type ToolItem = {
  key: string;
  label: string;
  tooltip: string;
  shortcut?: string;
  action: ToolAction;
};

const TOOLS: ToolItem[] = [
  { key: 'h2', label: 'H2', tooltip: '二级标题', action: { type: 'linePrefix', prefix: '## ' } },
  { key: 'h3', label: 'H3', tooltip: '三级标题', action: { type: 'linePrefix', prefix: '### ' } },
  {
    key: 'bold',
    label: 'B',
    tooltip: '加粗',
    shortcut: '⌘B',
    action: { type: 'wrap', before: '**', after: '**' },
  },
  {
    key: 'italic',
    label: 'I',
    tooltip: '斜体',
    shortcut: '⌘I',
    action: { type: 'wrap', before: '*', after: '*' },
  },
  { key: 'ul', label: '•', tooltip: '无序列表', action: { type: 'linePrefix', prefix: '- ' } },
  { key: 'ol', label: '1.', tooltip: '有序列表', action: { type: 'linePrefix', prefix: '1. ' } },
  {
    key: 'task',
    label: '☐',
    tooltip: '任务列表',
    action: { type: 'linePrefix', prefix: '- [ ] ' },
  },
  { key: 'quote', label: '“”', tooltip: '引用', action: { type: 'linePrefix', prefix: '> ' } },
  {
    key: 'code',
    label: '<>',
    tooltip: '行内代码',
    action: { type: 'wrap', before: '`', after: '`' },
  },
  {
    key: 'codeblock',
    label: '{ }',
    tooltip: '代码块',
    action: { type: 'wrap', before: '\n```\n', after: '\n```\n' },
  },
  {
    key: 'link',
    label: '🔗',
    tooltip: '链接',
    shortcut: '⌘K',
    action: { type: 'wrap', before: '[', after: '](url)' },
  },
  {
    key: 'table',
    label: '⊞',
    tooltip: '表格',
    action: { type: 'insert', text: '\n| 列 1 | 列 2 |\n| --- | --- |\n| - | - |\n' },
  },
  { key: 'hr', label: '—', tooltip: '分隔线', action: { type: 'insert', text: '\n\n---\n\n' } },
];

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
  onImagePlaceholder?: () => void;
  disabled?: boolean;
};

function applyAction(textarea: HTMLTextAreaElement, action: ToolAction): string {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (action.type === 'wrap') {
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${action.before}${selected}${action.after}${value.slice(end)}`;
    queueMicrotask(() => {
      textarea.focus();
      const cursor = start + action.before.length + selected.length;
      textarea.setSelectionRange(cursor, cursor);
    });
    return next;
  }

  if (action.type === 'linePrefix') {
    const before = value.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const next = `${value.slice(0, lineStart)}${action.prefix}${value.slice(lineStart)}`;
    queueMicrotask(() => {
      textarea.focus();
      const cursor = end + action.prefix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
    return next;
  }

  const next = `${value.slice(0, start)}${action.text}${value.slice(end)}`;
  queueMicrotask(() => {
    textarea.focus();
    const cursor = start + action.text.length;
    textarea.setSelectionRange(cursor, cursor);
  });
  return next;
}

export function ResearchNoteEditorToolbar({
  textareaRef,
  onChange,
  onImagePlaceholder,
  disabled = false,
}: Props) {
  const trigger = (action: ToolAction) => () => {
    if (disabled) return;
    const ta = textareaRef.current;
    if (!ta) return;
    onChange(applyAction(ta, action));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        flexWrap: 'wrap',
        bgcolor: 'background.neutral',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={0.25} alignItems="center" flexWrap="wrap">
        {TOOLS.map((tool) => (
          <Box key={tool.key} sx={{ display: 'inline-flex', alignItems: 'center' }}>
            {(tool.key === 'bold' ||
              tool.key === 'ul' ||
              tool.key === 'code' ||
              tool.key === 'link') && (
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
            )}
            <Tooltip
              title={tool.shortcut ? `${tool.tooltip} (${tool.shortcut})` : tool.tooltip}
              arrow
            >
              <span>
                <IconButton
                  size="small"
                  onClick={trigger(tool.action)}
                  sx={{ minWidth: 28 }}
                  aria-label={tool.tooltip}
                  disabled={disabled}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: tool.key === 'bold' ? 700 : 500,
                      fontStyle: tool.key === 'italic' ? 'italic' : 'normal',
                      lineHeight: 1,
                    }}
                  >
                    {tool.label}
                  </Typography>
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        <Tooltip title="插入图片（即将上线）" arrow>
          <span>
            <IconButton
              size="small"
              onClick={onImagePlaceholder}
              disabled
              aria-label="插入图片（即将上线）"
            >
              <Iconify icon="solar:document-bold" width={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}
