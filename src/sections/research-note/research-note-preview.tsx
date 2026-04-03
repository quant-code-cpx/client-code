import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  content: string;
};

export function ResearchNotePreview({ content }: Props) {
  return (
    <Box
      sx={{
        fontSize: 14,
        lineHeight: 1.8,
        color: 'text.primary',
        '& h1, & h2, & h3, & h4, & h5, & h6': {
          fontWeight: 700,
          lineHeight: 1.4,
          mt: 2,
          mb: 1,
          color: 'text.primary',
        },
        '& h1': { fontSize: '2em' },
        '& h2': { fontSize: '1.5em' },
        '& h3': { fontSize: '1.25em' },
        '& p': { my: 1 },
        '& ul, & ol': { pl: 3, my: 1 },
        '& li': { mb: 0.5 },
        '& code': {
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontSize: '0.875em',
          fontFamily: 'monospace',
          bgcolor: 'action.hover',
          color: 'error.main',
        },
        '& pre': {
          p: 2,
          my: 1,
          borderRadius: 1,
          overflowX: 'auto',
          bgcolor: 'action.hover',
          '& code': { bgcolor: 'transparent', color: 'text.primary', p: 0 },
        },
        '& blockquote': {
          my: 1,
          pl: 2,
          borderLeft: '4px solid',
          borderColor: 'divider',
          color: 'text.secondary',
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          my: 1,
        },
        '& th, & td': {
          px: 1.5,
          py: 0.75,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'left',
        },
        '& th': { bgcolor: 'action.hover', fontWeight: 600 },
        '& a': { color: 'primary.main', textDecoration: 'underline' },
        '& img': { maxWidth: '100%', borderRadius: 1 },
        '& hr': { my: 2, border: 'none', borderTop: '1px solid', borderColor: 'divider' },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <Typography variant="h4" component="h1">{children}</Typography>,
          h2: ({ children }) => <Typography variant="h5" component="h2">{children}</Typography>,
          h3: ({ children }) => <Typography variant="h6" component="h3">{children}</Typography>,
          p: ({ children }) => <Typography variant="body2" component="p" sx={{ my: 1 }}>{children}</Typography>,
          hr: () => <Divider sx={{ my: 2 }} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
