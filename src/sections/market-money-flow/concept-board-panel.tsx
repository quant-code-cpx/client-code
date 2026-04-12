import type { ConceptItem, ConceptMemberItem } from 'src/api/market';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { fetchConceptList, fetchConceptMembers } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ConceptRowProps = {
  concept: ConceptItem;
  tradeDate?: string;
};

function ConceptRow({ concept, tradeDate }: ConceptRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<ConceptMemberItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !loaded) {
      setMembersLoading(true);
      try {
        const result = await fetchConceptMembers({
          tsCode: concept.code,
        });
        setMembers(result.members ?? []);
        setLoaded(true);
      } catch {
        // ignore
      } finally {
        setMembersLoading(false);
      }
    }
    setExpanded((prev) => !prev);
  };

  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={handleExpand}>
            {membersLoading ? (
              <CircularProgress size={16} />
            ) : (
              <Iconify
                icon={expanded ? 'solar:alt-arrow-down-bold' : 'solar:arrow-right-bold'}
                width={16}
              />
            )}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {concept.name}
          </Typography>
        </TableCell>
        <TableCell align="right">
          {concept.pctChange != null ? (
            <Box
              component="span"
              sx={{
                color:
                  concept.pctChange > 0
                    ? 'error.main'
                    : concept.pctChange < 0
                      ? 'success.main'
                      : 'text.secondary',
                fontWeight: 500,
              }}
            >
              {fPctChg(concept.pctChange)}
            </Box>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell align="right">{concept.count}</TableCell>
        <TableCell align="right">
          {concept.amount != null ? fWanYuan(concept.amount) : '-'}
        </TableCell>
        <TableCell align="right">
          {concept.netAmount != null ? (
            <Box
              component="span"
              sx={{
                color:
                  concept.netAmount > 0
                    ? 'error.main'
                    : concept.netAmount < 0
                      ? 'success.main'
                      : 'text.secondary',
              }}
            >
              {fWanYuan(concept.netAmount)}
            </Box>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell>
          {concept.leadStock ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2">{concept.leadStock}</Typography>
              {concept.leadPctChg != null && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 12,
                    color: concept.leadPctChg >= 0 ? 'error.main' : 'success.main',
                  }}
                >
                  {fPctChg(concept.leadPctChg)}
                </Box>
              )}
            </Stack>
          ) : (
            '-'
          )}
        </TableCell>
      </TableRow>

      {/* 展开的成分股 */}
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, bgcolor: 'action.hover' }}>
          <Collapse in={expanded} unmountOnExit>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                成分股明细（共 {members.length} 只）
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell align="right">涨跌幅</TableCell>
                    <TableCell align="right">收盘价</TableCell>
                    <TableCell align="right">成交额（万）</TableCell>
                    <TableCell align="right">净流入（万）</TableCell>
                    <TableCell>所属行业</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.tsCode} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {m.tsCode}
                      </TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell align="right">
                        {m.pctChg != null ? (
                          <Box
                            component="span"
                            sx={{
                              color:
                                m.pctChg > 0
                                  ? 'error.main'
                                  : m.pctChg < 0
                                    ? 'success.main'
                                    : 'text.secondary',
                            }}
                          >
                            {fPctChg(m.pctChg)}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {m.close != null ? m.close.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {m.amount != null ? fWanYuan(m.amount) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {m.netAmount != null ? (
                          <Box
                            component="span"
                            sx={{
                              color:
                                m.netAmount > 0
                                  ? 'error.main'
                                  : m.netAmount < 0
                                    ? 'success.main'
                                    : 'text.secondary',
                            }}
                          >
                            {fWanYuan(m.netAmount)}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{m.industry ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          暂无成分股数据
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function ConceptBoardPanel({ tradeDate }: Props) {
  const [items, setItems] = useState<ConceptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchConceptList({
        keyword: keyword || undefined,
        page: 1,
        pageSize: 100,
      });
      setItems(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取概念板块列表失败');
    } finally {
      setLoading(false);
    }
  }, [tradeDate, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setKeyword(searchInput);
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">概念板块</Typography>
            {items.length > 0 && (
              <Chip label={`${items.length} 个`} size="small" variant="outlined" />
            )}
          </Stack>
          <TextField
            size="small"
            placeholder="搜索概念..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ width: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:magnifier-bold" width={16} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>概念名称</TableCell>
                  <TableCell align="right">
                    <TableSortLabel active direction="desc">
                      涨跌幅
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">成分股数</TableCell>
                  <TableCell align="right">成交额（万）</TableCell>
                  <TableCell align="right">净流入（万）</TableCell>
                  <TableCell>领涨股</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((concept, i) => (
                  <ConceptRow
                    key={concept.code || `concept-${i}`}
                    concept={concept}
                    tradeDate={tradeDate}
                  />
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        暂无数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
