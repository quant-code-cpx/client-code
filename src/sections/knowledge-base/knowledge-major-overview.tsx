import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { pageHeaderSx, overviewCardSx, overviewGridSx } from './knowledge-base.styles';

import type { KnowledgeMajor } from './types';

type Props = {
  major: KnowledgeMajor;
};

export function KnowledgeMajorOverview({ major }: Props) {
  return (
    <DashboardContent maxWidth="xl">
      <Box sx={pageHeaderSx}>
        <Breadcrumbs aria-label="知识库面包屑" sx={{ mb: 1.5 }}>
          <Link component={RouterLink} href={paths.knowledge.root} color="inherit" underline="hover">
            知识库
          </Link>
          <Typography color="text.primary">{major.title}</Typography>
        </Breadcrumbs>

        <Typography variant="overline" sx={{ color: 'primary.main' }}>
          大专题 {major.code}
        </Typography>
        <Typography component="h1" variant="h3" sx={{ mt: 0.5 }}>
          {major.title}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, maxWidth: 760, color: 'text.secondary' }}>
          {major.summary}
        </Typography>
      </Box>

      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography component="h2" variant="h5">
          已发布小专题
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {major.topics.length} / {major.plannedTopicCount}
        </Typography>
      </Stack>

      <Stack component="section" aria-label={`${major.title}已发布小专题`} sx={overviewGridSx}>
        {major.topics.map((topic) => (
          <Card key={topic.slug} variant="outlined" sx={overviewCardSx}>
            <CardActionArea
              component={RouterLink}
              href={paths.knowledge.topic(major.slug, topic.slug)}
              sx={{ height: 1, p: 0.5 }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Stack spacing={1} sx={{ minWidth: 0, flex: '1 1 auto' }}>
                    <Typography variant="overline" sx={{ color: 'primary.main' }}>
                      小专题 {topic.code}
                    </Typography>
                    <Typography component="h3" variant="h5">
                      {topic.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {topic.summary}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {topic.knowledgePointIds.length} 个知识点 · 已完成专业校对
                    </Typography>
                  </Stack>
                  <Stack component="span" direction="row" spacing={0.5} alignItems="center" sx={{ color: 'primary.main' }}>
                    <Box component="span" sx={{ typography: 'button', whiteSpace: 'nowrap' }}>
                      阅读
                    </Box>
                    <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
                  </Stack>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </DashboardContent>
  );
}
