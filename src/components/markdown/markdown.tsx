import 'katex/dist/katex.min.css';

import type { Node, Root, Parent } from 'mdast';
import type { Theme, SxProps } from '@mui/material/styles';

import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import type { MarkdownProps } from './markdown.types';

const DEFAULT_MAX_LENGTH = 60_000;
const CITATION_PROTOCOL = 'citation:';
const NUMERIC_AMOUNT_PREFIX = /^\s*[+-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)/;

type InlineMathNode = Node & { type: 'inlineMath'; value: string };

function isParent(node: Node): node is Parent {
  return 'children' in node && Array.isArray(node.children);
}

function isInlineMath(node: Node): node is InlineMathNode {
  return node.type === 'inlineMath' && 'value' in node && typeof node.value === 'string';
}

function remarkRestoreCurrencyDollarPairs() {
  return (tree: Root) => {
    const visitParent = (parent: Parent) => {
      parent.children.forEach((node, index) => {
        const next = parent.children[index + 1];
        if (
          isInlineMath(node) &&
          NUMERIC_AMOUNT_PREFIX.test(node.value) &&
          next?.type === 'text' &&
          NUMERIC_AMOUNT_PREFIX.test(next.value)
        ) {
          parent.children[index] = { type: 'text', value: `$${node.value}$` };
          return;
        }

        if (isParent(node)) visitParent(node);
      });
    };

    visitParent(tree);
  };
}

const markdownStyles: SxProps<Theme> = {
  minWidth: 0,
  fontSize: 14,
  lineHeight: 1.75,
  color: 'text.primary',
  overflowWrap: 'anywhere',
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    mt: 2,
    mb: 1,
    lineHeight: 1.4,
    fontWeight: 700,
    color: 'text.primary',
  },
  '& p': { my: 1 },
  '& ul, & ol': { pl: 3, my: 1 },
  '& li': { mb: 0.5 },
  '& code': {
    px: 0.5,
    py: 0.25,
    borderRadius: 0.5,
    fontSize: 12,
    fontFamily: 'monospace',
    bgcolor: 'action.hover',
    color: 'error.main',
  },
  '& pre': {
    p: 2,
    my: 1.5,
    maxWidth: '100%',
    borderRadius: 1,
    overflowX: 'auto',
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    '& code': { p: 0, bgcolor: 'transparent', color: 'text.primary' },
  },
  '& blockquote': {
    my: 1.5,
    mx: 0,
    pl: 2,
    borderLeft: '3px solid',
    borderColor: 'primary.main',
    color: 'text.secondary',
  },
  '& table': {
    width: '100%',
    minWidth: 480,
    borderCollapse: 'collapse',
  },
  '& th, & td': {
    px: 1.5,
    py: 0.75,
    border: '1px solid',
    borderColor: 'divider',
    textAlign: 'left',
    fontSize: 13,
  },
  '& th': { bgcolor: 'action.hover', fontWeight: 700 },
  '& del': { color: 'text.disabled' },
  '& .katex-display': {
    my: 1.5,
    maxWidth: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
  },
};

export function safeMarkdownUrl(url: string): string {
  const value = url.trim();
  if (value.startsWith(CITATION_PROTOCOL)) return value;
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

export function Markdown({
  children,
  streaming = false,
  maxLength = DEFAULT_MAX_LENGTH,
  sx,
  citationResolver,
}: MarkdownProps) {
  const bounded = children.slice(0, maxLength);
  const truncated = children.length > maxLength;

  if (streaming) {
    return (
      <Typography
        component="div"
        variant="body1"
        sx={[{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.75 }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        {bounded}
      </Typography>
    );
  }

  return (
    <Box sx={[markdownStyles, ...(Array.isArray(sx) ? sx : [sx])]}> 
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath, remarkRestoreCurrencyDollarPairs]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={safeMarkdownUrl}
        components={{
          h1: ({ children: heading }) => (
            <Typography variant="h4" component="h1">
              {heading}
            </Typography>
          ),
          h2: ({ children: heading }) => (
            <Typography variant="h5" component="h2">
              {heading}
            </Typography>
          ),
          h3: ({ children: heading }) => (
            <Typography variant="h6" component="h3">
              {heading}
            </Typography>
          ),
          p: ({ children: paragraph }) => (
            <Typography variant="body2" component="p">
              {paragraph}
            </Typography>
          ),
          a: ({ href = '', children: label }) => {
            const citationId = href.startsWith(CITATION_PROTOCOL)
              ? href.slice(CITATION_PROTOCOL.length)
              : null;
            const target = citationId ? citationResolver?.(citationId) : null;
            const resolvedHref = target?.href ?? href;
            const safeHref = safeMarkdownUrl(resolvedHref);
            if (!safeHref || safeHref.startsWith(CITATION_PROTOCOL)) {
              return <Box component="span">{target?.label ?? label}</Box>;
            }
            const external = /^https?:\/\//i.test(safeHref);
            return (
              <Link
                href={safeHref}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                {target?.label ?? label}
              </Link>
            );
          },
          img: ({ alt }) => (
            <Box component="span" role="note" sx={{ color: 'text.secondary' }}>
              [图片已禁用{alt ? `：${alt}` : ''}]
            </Box>
          ),
          table: ({ children: table }) => (
            <Box sx={{ my: 1.5, maxWidth: '100%', overflowX: 'auto' }}>
              <table>{table}</table>
            </Box>
          ),
          hr: () => <Divider sx={{ my: 2 }} />,
        }}
      >
        {bounded}
      </ReactMarkdown>
      {truncated ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
          内容过长，已在安全上限处截断。
        </Typography>
      ) : null}
    </Box>
  );
}
