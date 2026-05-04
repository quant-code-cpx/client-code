import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { ResearchNotePreview } from './research-note-preview';
import { ResearchNoteEditorToolbar } from './research-note-editor-toolbar';

// ----------------------------------------------------------------------

type Props = {
  content: string;
  onChange: (content: string) => void;
  onImagePaste?: () => void;
};

const SHORTCUT_WRAPS: Record<string, { before: string; after: string }> = {
  b: { before: '**', after: '**' },
  i: { before: '*', after: '*' },
  k: { before: '[', after: '](url)' },
};

export function ResearchNoteEditor({ content, onChange, onImagePaste }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileTab, setMobileTab] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const wrap = SHORTCUT_WRAPS[key];
    if (!wrap) return;
    event.preventDefault();
    const ta = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${wrap.before}${selected}${wrap.after}${value.slice(end)}`;
    onChange(next);
    queueMicrotask(() => {
      ta.focus();
      const cursor = start + wrap.before.length + selected.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 占位：检测到图片时提示后端未就绪
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].type.startsWith('image/')) {
        event.preventDefault();
        onImagePaste?.();
        return;
      }
    }
  };

  const editorPane = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <ResearchNoteEditorToolbar
        textareaRef={textareaRef}
        onChange={onChange}
        onImagePlaceholder={onImagePaste}
      />
      <Box
        component="textarea"
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="使用 Markdown 撰写笔记...  ⌘B 加粗 / ⌘I 斜体 / ⌘K 链接"
        sx={{
          width: '100%',
          minHeight: 460,
          p: 2,
          fontSize: 14,
          lineHeight: 1.7,
          fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
          color: 'text.primary',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          resize: 'vertical',
          outline: 'none',
          transition: theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:focus': {
            borderColor: 'primary.main',
          },
        }}
      />
    </Box>
  );

  const previewPane = (
    <Box
      sx={{
        p: 2,
        minHeight: 460,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'auto',
      }}
    >
      <ResearchNotePreview content={content} />
    </Box>
  );

  if (isMobile) {
    return (
      <Box>
        <Tabs
          value={mobileTab}
          onChange={(_, v) => setMobileTab(v)}
          sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="编辑" />
          <Tab label="预览" />
        </Tabs>
        {mobileTab === 0 ? editorPane : previewPane}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      {editorPane}
      {previewPane}
    </Box>
  );
}
