import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { knowledgeMajors } from './content/knowledge-catalog';
import { pageHeaderSx, overviewCardSx, overviewGridSx } from './knowledge-base.styles';

export function KnowledgeOverview() {
  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1} sx={pageHeaderSx}>
        <Typography component="h1" variant="h3">
          知识库
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 760, color: 'text.secondary' }}>
          从个人财务和经济直觉起步，逐步进入公司研究、金融数据、量化交易与实盘治理。
          这里只展示已经完成专业校对并正式发布的内容。
        </Typography>
      </Stack>

      <Typography component="h2" variant="h5" sx={{ mb: 2 }}>
        已发布大专题
      </Typography>

      <Stack component="section" aria-label="已发布大专题" sx={overviewGridSx}>
        {knowledgeMajors.map((major) => (
          <Card key={major.slug} variant="outlined" sx={overviewCardSx}>
            <CardActionArea
              component={RouterLink}
              href={paths.knowledge.major(major.slug)}
              sx={{ height: 1, p: 0.5 }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Iconify icon={major.icon} width={32} sx={{ mt: 0.25, color: 'primary.main' }} />
                  <Stack spacing={1} sx={{ minWidth: 0, flex: '1 1 auto' }}>
                    <Typography variant="overline" sx={{ color: 'primary.main' }}>
                      大专题 {major.code}
                    </Typography>
                    <Typography component="h3" variant="h5">
                      {major.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {major.summary}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      已发布 {major.topics.length} / {major.plannedTopicCount} 个小专题
                    </Typography>
                  </Stack>
                  <Stack component="span" direction="row" spacing={0.5} alignItems="center" sx={{ color: 'primary.main' }}>
                    <Box component="span" sx={{ typography: 'button', whiteSpace: 'nowrap' }}>
                      进入
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
