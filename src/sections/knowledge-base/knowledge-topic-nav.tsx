import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { navigationPaperSx } from './knowledge-base.styles';

import type { KnowledgeMajor, KnowledgeTopic } from './types';

type Props = {
  major: KnowledgeMajor;
  topic: KnowledgeTopic;
};

export function KnowledgeTopicNav({ major, topic }: Props) {
  return (
    <Paper component="nav" aria-label="小专题目录" variant="outlined" sx={navigationPaperSx}>
      <Stack spacing={0.5} sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          小专题目录
        </Typography>
        <Typography variant="subtitle1">{major.title}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          已发布 {major.topics.length} / {major.plannedTopicCount}
        </Typography>
      </Stack>

      <Divider />

      <List disablePadding sx={{ p: 1 }}>
        {major.topics.map((candidate) => {
          const current = candidate.slug === topic.slug;

          return (
            <ListItemButton
              key={candidate.slug}
              component={RouterLink}
              href={paths.knowledge.topic(major.slug, candidate.slug)}
              aria-current={current ? 'page' : undefined}
              selected={current}
              sx={{
                minHeight: 40,
                px: 1.5,
                borderRadius: 0.75,
                color: current ? 'primary.main' : 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                },
                '&.Mui-selected:hover': { bgcolor: 'action.selected' },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: current ? 700 : 500 }}>
                  {candidate.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {candidate.code}
                </Typography>
              </Box>
            </ListItemButton>
          );
        })}
      </List>

      <Divider />

      <Button
        component={RouterLink}
        href={paths.knowledge.major(major.slug)}
        color="inherit"
        fullWidth
        endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
        sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}
      >
        返回大专题
      </Button>
    </Paper>
  );
}
