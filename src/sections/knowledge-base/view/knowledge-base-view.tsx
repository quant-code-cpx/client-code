import { useParams } from 'react-router';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { KnowledgeOverview } from '../knowledge-overview';
import { KnowledgeTopicArticle } from '../knowledge-topic-article';
import { KnowledgeMajorOverview } from '../knowledge-major-overview';
import { findKnowledgeMajor, findKnowledgeTopic } from '../content/knowledge-catalog';

function KnowledgeNotFound({ majorSlug }: { majorSlug?: string }) {
  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ maxWidth: 720 }}>
        <Typography component="h1" variant="h3" sx={{ mb: 2 }}>
          未找到这个知识页面
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          该地址不存在，或对应小专题尚未完成专业校对和发布。
        </Alert>
        <Button
          component={RouterLink}
          href={majorSlug ? paths.knowledge.major(majorSlug) : paths.knowledge.root}
          variant="contained"
        >
          {majorSlug ? '返回大专题' : '返回知识库'}
        </Button>
      </Box>
    </DashboardContent>
  );
}

export function KnowledgeBaseView() {
  const { majorSlug, topicSlug } = useParams<{ majorSlug?: string; topicSlug?: string }>();

  if (!majorSlug) return <KnowledgeOverview />;

  const major = findKnowledgeMajor(majorSlug);
  if (!major) return <KnowledgeNotFound />;
  if (!topicSlug) return <KnowledgeMajorOverview major={major} />;

  const topic = findKnowledgeTopic(major, topicSlug);
  if (!topic) return <KnowledgeNotFound majorSlug={major.slug} />;

  return (
    <DashboardContent maxWidth="xl">
      <KnowledgeTopicArticle major={major} topic={topic} />
    </DashboardContent>
  );
}
