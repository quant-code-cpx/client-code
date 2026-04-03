import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { ResearchNotePreview } from './research-note-preview';

// ----------------------------------------------------------------------

type Props = {
  content: string;
  onChange: (content: string) => void;
};

export function ResearchNoteEditor({ content, onChange }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileTab, setMobileTab] = useState(0);

  const editorPane = (
    <TextField
      multiline
      minRows={20}
      fullWidth
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder="使用 Markdown 格式撰写笔记内容..."
      sx={{
        '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: 13 },
        '& .MuiOutlinedInput-root': { height: '100%', alignItems: 'flex-start' },
      }}
    />
  );

  const previewPane = (
    <Box
      sx={{
        p: 2,
        minHeight: 400,
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
