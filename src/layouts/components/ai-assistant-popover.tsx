import type { IconButtonProps } from '@mui/material/IconButton';

import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

const QUICK_PROMPTS = [
  'Sales summary',
  'Active users',
  'Top products',
  'Pending tasks',
];

/** Rule-based reply engine — answers questions about this dashboard's mock data. */
function getAiReply(input: string): string {
  const q = input.toLowerCase();

  if (/sale|revenue|order|purchase/.test(q)) {
    return 'This week\'s sales total **$714 k** (+2.6% vs last week). Purchase orders stand at **1.72 M** (+2.8%). The strongest months were May–Jun based on the sparkline trend.';
  }
  if (/user|member|sign.?up|register/.test(q)) {
    return 'There are **24 registered users** in the system. **18 are active** and **6 are banned**. New user registrations this period: **1,352,831** (−0.1% vs last period).';
  }
  if (/product|item|inventory|stock/.test(q)) {
    return 'The catalogue has **24 products**. **3 are on sale**, **3 are marked new**, and the rest are at regular price. Price range: $4 – $99.';
  }
  if (/message|inbox|chat/.test(q)) {
    return 'There are currently **234 messages** (+3.6% vs last week). Check the Notifications panel for unread message alerts.';
  }
  if (/visit|traffic|source/.test(q)) {
    return 'Traffic breakdown: **Google** leads with 91.2 k visits, followed by **Twitter** (84.9 k), **LinkedIn** (69.8 k), and **Facebook** (19.5 k).';
  }
  if (/task|todo|pending/.test(q)) {
    return 'There are **5 active tasks** on the board right now. Head to the Dashboard → Tasks widget to check them off.';
  }
  if (/blog|post|article/.test(q)) {
    return 'The blog has **23 published posts**. Each averages ~8.8 k views, 8.6 k shares, and 7.9 k comments.';
  }
  if (/tech|stack|built|framework|react|mui|vite/.test(q)) {
    return 'This dashboard is built with **React 19**, **Material-UI 7**, **TypeScript 5**, and **Vite 6**. Charts are powered by **ApexCharts**, and icons by **Iconify**.';
  }
  if (/help|what can|feature|do/.test(q)) {
    return 'I can answer questions about your dashboard data:\n• **Sales & revenue**\n• **Users & sign-ups**\n• **Products & inventory**\n• **Traffic sources**\n• **Tasks & blog posts**\n\nJust ask!';
  }

  return 'I\'m not sure about that yet. Try asking about sales, users, products, traffic, tasks, or blog posts.';
}

// ----------------------------------------------------------------------

export type AiAssistantPopoverProps = IconButtonProps;

export function AiAssistantPopover({ sx, ...other }: AiAssistantPopoverProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Hi! I\'m your dashboard AI assistant. Ask me anything about your sales, users, products, or site traffic.',
    },
  ]);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchor(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchor(null), []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || thinking) return;

      const userMsg: Message = { id: nextId.current++, role: 'user', text: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setThinking(true);

      // Simulate a short AI "thinking" delay
      setTimeout(() => {
        const reply = getAiReply(text);
        setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: reply }]);
        setThinking(false);
        // Scroll to bottom
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
      }, 600);
    },
    [thinking]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  return (
    <>
      <Tooltip title="AI Assistant">
        <IconButton
          color={anchor ? 'primary' : 'default'}
          onClick={handleOpen}
          sx={sx}
          {...other}
        >
          <Iconify width={24} icon="custom:ai-sparkle" />
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            py: 2,
            px: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            background: (theme) =>
              `linear-gradient(135deg, ${theme.vars.palette.primary.darker}, ${theme.vars.palette.secondary.darker})`,
          }}
        >
          <Iconify icon="custom:ai-sparkle" width={22} sx={{ color: 'common.white', flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ color: 'common.white', lineHeight: 1.2 }}>
              AI Assistant
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              Powered by Minimal UI · dashboard-aware
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Chat area */}
        <Scrollbar
          scrollableNodeProps={{ ref: scrollRef }}
          sx={{ height: 320, px: 1.5, py: 1.5 }}
        >
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                mb: 1.5,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  maxWidth: '82%',
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  typography: 'body2',
                  whiteSpace: 'pre-line',
                  ...(msg.role === 'user'
                    ? {
                        bgcolor: 'primary.main',
                        color: 'common.white',
                        borderBottomRightRadius: 4,
                      }
                    : {
                        bgcolor: 'background.neutral',
                        color: 'text.primary',
                        borderBottomLeftRadius: 4,
                      }),
                }}
              >
                {msg.text}
              </Box>
            </Box>
          ))}

          {thinking && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5, mb: 1 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    animation: 'ai-bounce 1s ease-in-out infinite',
                    animationDelay: `${i * 0.18}s`,
                    '@keyframes ai-bounce': {
                      '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.5 },
                      '40%': { transform: 'scale(1)', opacity: 1 },
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Scrollbar>

        {/* Quick prompts */}
        <Box sx={{ px: 1.5, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {QUICK_PROMPTS.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              variant="outlined"
              onClick={() => sendMessage(label)}
              sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
            />
          ))}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Input */}
        <Box sx={{ p: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask anything about your dashboard…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={thinking}
            inputProps={{ 'aria-label': 'Ask the AI assistant' }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={!input.trim() || thinking}
                      onClick={() => sendMessage(input)}
                    >
                      <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </Popover>
    </>
  );
}
