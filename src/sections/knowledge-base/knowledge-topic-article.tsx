import { useLocation } from 'react-router';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown/markdown';

import { KnowledgePointToc } from './knowledge-point-toc';
import { KnowledgeTopicNav } from './knowledge-topic-nav';
import { parseKnowledgeArticle } from './parse-knowledge-article';
import {
  pageHeaderSx,
  stickyPanelSx,
  articleGridSx,
  sourceReviewSx,
  articleIntroSx,
  articlePaperSx,
  articleMarkdownSx,
  knowledgePointSectionSx,
} from './knowledge-base.styles';

import type {
  KnowledgeMajor,
  KnowledgePoint,
  KnowledgeTopic,
  KnowledgeReview,
  ParsedKnowledgeArticle,
} from './types';

type Props = {
  major: KnowledgeMajor;
  topic: KnowledgeTopic;
};

type ArticleState =
  | { status: 'loading' }
  | { status: 'ready'; article: ParsedKnowledgeArticle }
  | { status: 'error'; message: string };

function assertKnowledgePointOrder(topic: KnowledgeTopic, article: ParsedKnowledgeArticle) {
  const actual = article.points.map((point) => point.id);
  const expected = [...topic.knowledgePointIds];

  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    throw new Error(`小专题 ${topic.code} 的知识点目录与正文不一致`);
  }
}

function useKnowledgeArticle(topic: KnowledgeTopic) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<ArticleState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    topic
      .loadContent()
      .then((content) => {
        const article = parseKnowledgeArticle(content);
        assertKnowledgePointOrder(topic, article);
        if (active) setState({ status: 'ready', article });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '知识页面加载失败',
        });
      });

    return () => {
      active = false;
    };
  }, [reloadKey, topic]);

  return { state, retry: () => setReloadKey((current) => current + 1) };
}

function useActiveKnowledgePoint(points: readonly KnowledgePoint[]) {
  const location = useLocation();
  const [activePointId, setActivePointId] = useState('');

  useEffect(() => {
    const ids = new Set(points.map((point) => point.id));
    const hashId = location.hash.slice(1);
    setActivePointId(ids.has(hashId) ? hashId : (points[0]?.id ?? ''));
    const hashTarget = ids.has(hashId) ? document.getElementById(hashId) : null;
    const scrollFrame = hashTarget
      ? window.requestAnimationFrame(() => hashTarget.scrollIntoView({ block: 'start' }))
      : null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        if (visible[0]?.target.id) setActivePointId(visible[0].target.id);
      },
      { rootMargin: '-88px 0px -65% 0px', threshold: [0, 0.1, 0.5] }
    );

    points.forEach((point) => {
      const element = document.getElementById(point.id);
      if (element) observer.observe(element);
    });

    return () => {
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      observer.disconnect();
    };
  }, [location.hash, points]);

  return { activePointId, setActivePointId };
}

function ArticleLoading() {
  return (
    <Paper variant="outlined" aria-label="知识页面加载中" sx={articlePaperSx}>
      <Skeleton variant="text" width="35%" height={36} />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="rounded" height={112} sx={{ my: 3 }} />
      <Skeleton variant="text" width="45%" height={32} />
      <Skeleton variant="text" />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="75%" />
    </Paper>
  );
}

function ArticleError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            重试
          </Button>
        }
      >
        页面内容未能通过加载或结构校验：{message}
      </Alert>
    </Paper>
  );
}

function KnowledgePointSection({ point, index }: { point: KnowledgePoint; index: number }) {
  return (
    <Box component="section" id={point.id} aria-labelledby={`${point.id}-title`} sx={knowledgePointSectionSx}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
        <Typography
          variant="caption"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 0.4, whiteSpace: 'nowrap' }}
        >
          知识点 {String(index + 1).padStart(2, '0')}
        </Typography>
        <Divider flexItem orientation="vertical" />
        <Typography id={`${point.id}-title`} component="h2" variant="h5">
          {point.title}
        </Typography>
      </Stack>

      <Markdown sx={articleMarkdownSx}>{point.markdown}</Markdown>
    </Box>
  );
}

function SourceReview({ review }: { review: KnowledgeReview }) {
  return (
    <Paper component="section" aria-labelledby="knowledge-source-review" variant="outlined" sx={sourceReviewSx}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Iconify icon="solar:shield-check-bold" width={20} sx={{ color: 'primary.main' }} />
        <Typography id="knowledge-source-review" component="h2" variant="subtitle1">
          专业校对记录
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        本页于 {review.reviewedAt} 按以下官方统计、中央银行与金融教育资料逐项校对。来源用于核验定义和口径，
        不代表收益承诺或个性化建议。
      </Typography>
      <Stack component="ul" spacing={1} sx={{ mt: 1.5, mb: 0, pl: 2.5 }}>
        {review.sources.map((source) => (
          <Typography component="li" variant="body2" key={source.url}>
            <Link href={source.url} target="_blank" rel="noopener noreferrer">
              {source.publisher}：{source.title}
            </Link>
            <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
              {' '}
              — {source.coverage}
            </Typography>
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}

function ReadyArticle({
  major,
  topic,
  article,
}: {
  major: KnowledgeMajor;
  topic: KnowledgeTopic;
  article: ParsedKnowledgeArticle;
}) {
  const { activePointId, setActivePointId } = useActiveKnowledgePoint(article.points);

  return (
    <Box sx={articleGridSx}>
      <Box sx={stickyPanelSx}>
        <KnowledgeTopicNav major={major} topic={topic} />
      </Box>

      <Paper component="article" variant="outlined" sx={articlePaperSx}>
        <Paper variant="outlined" sx={articleIntroSx}>
          <Markdown sx={articleMarkdownSx}>{article.intro}</Markdown>
        </Paper>

        <Stack spacing={4} divider={<Divider flexItem />}>
          {article.points.map((point, index) => (
            <KnowledgePointSection key={point.id} point={point} index={index} />
          ))}
        </Stack>

        <SourceReview review={topic.review} />

        <Button
          component={RouterLink}
          href={paths.knowledge.major(major.slug)}
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-back-fill" />}
          sx={{ mt: 3 }}
        >
          返回大专题
        </Button>
      </Paper>

      <Box sx={stickyPanelSx}>
        <KnowledgePointToc
          points={article.points}
          activePointId={activePointId}
          onPointSelect={setActivePointId}
        />
      </Box>
    </Box>
  );
}

export function KnowledgeTopicArticle({ major, topic }: Props) {
  const location = useLocation();
  const { state, retry } = useKnowledgeArticle(topic);
  const [copyFeedback, setCopyFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = new URL(`${location.pathname}${location.search}${location.hash}`, window.location.origin);
      await navigator.clipboard.writeText(url.href);
      setCopyFeedback({ severity: 'success', message: '页面链接已复制' });
    } catch {
      setCopyFeedback({ severity: 'error', message: '复制失败，请从地址栏复制链接' });
    }
  }, [location.hash, location.pathname, location.search]);

  return (
    <>
      <Box sx={pageHeaderSx}>
        <Breadcrumbs aria-label="知识库面包屑" sx={{ mb: 1.5 }}>
          <Link component={RouterLink} href={paths.knowledge.root} color="inherit" underline="hover">
            知识库
          </Link>
          <Link
            component={RouterLink}
            href={paths.knowledge.major(major.slug)}
            color="inherit"
            underline="hover"
          >
            {major.title}
          </Link>
          <Typography color="text.primary">{topic.title}</Typography>
        </Breadcrumbs>

        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'primary.main' }}>
              小专题 {topic.code} · 静态知识页
            </Typography>
            <Typography component="h1" variant="h3" sx={{ mt: 0.5 }}>
              {topic.title}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, maxWidth: 760, color: 'text.secondary' }}>
              {topic.summary}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              {topic.knowledgePointIds.length} 个知识点 · 已完成专业校对
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:copy-bold" />}
            onClick={handleCopyLink}
            sx={{ flexShrink: 0 }}
          >
            复制链接
          </Button>
        </Stack>
      </Box>

      {state.status === 'loading' ? <ArticleLoading /> : null}
      {state.status === 'error' ? <ArticleError message={state.message} onRetry={retry} /> : null}
      {state.status === 'ready' ? <ReadyArticle major={major} topic={topic} article={state.article} /> : null}

      <Snackbar
        open={Boolean(copyFeedback)}
        autoHideDuration={2400}
        onClose={() => setCopyFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={copyFeedback?.severity ?? 'success'} onClose={() => setCopyFeedback(null)}>
          {copyFeedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
