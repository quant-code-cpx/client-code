import type { PriceAlertRule, PriceAlertRuleType } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import DialogContentText from '@mui/material/DialogContentText';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type RuleTypeConfig = { text: string; color: 'error' | 'success' };

const RULE_TYPE_CONFIG: Record<PriceAlertRuleType, RuleTypeConfig> = {
  PCT_CHANGE_UP: { text: '涨幅超过', color: 'error' },
  PCT_CHANGE_DOWN: { text: '跌幅超过', color: 'success' },
  PRICE_ABOVE: { text: '价格高于', color: 'error' },
  PRICE_BELOW: { text: '价格低于', color: 'success' },
  LIMIT_UP: { text: '涨停', color: 'error' },
  LIMIT_DOWN: { text: '跌停', color: 'success' },
};

function formatThreshold(rule: PriceAlertRule): string {
  if (rule.threshold === null) return '—';
  if (rule.ruleType === 'PCT_CHANGE_UP' || rule.ruleType === 'PCT_CHANGE_DOWN') {
    return `${rule.threshold}%`;
  }
  return `${rule.threshold} 元`;
}

type Props = {
  rules: PriceAlertRule[];
  loading: boolean;
  onEdit: (rule: PriceAlertRule) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (rule: PriceAlertRule) => void;
};

export function AlertPriceRuleTable({ rules, loading, onEdit, onDelete, onToggleStatus }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<PriceAlertRule | null>(null);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  if (rules.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">暂无预警规则</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          点击&ldquo;新建规则&rdquo;开始设置价格预警
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>监控目标</TableCell>
              <TableCell>规则类型</TableCell>
              <TableCell>阈值</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">触发次数</TableCell>
              <TableCell>末次触发</TableCell>
              <TableCell>备注</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => {
              const typeConfig = RULE_TYPE_CONFIG[rule.ruleType];
              return (
                <TableRow key={rule.id} hover>
                  <TableCell>
                    {rule.tsCode ? (
                      <Box
                        component={RouterLink}
                        href={`/stock/detail?code=${rule.tsCode}`}
                        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {rule.tsCode}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {rule.sourceName ?? '—'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Label color={typeConfig.color} variant="soft">
                      {typeConfig.text}
                    </Label>
                  </TableCell>
                  <TableCell>{formatThreshold(rule)}</TableCell>
                  <TableCell>
                    <Label color={rule.status === 'ACTIVE' ? 'success' : 'warning'} variant="soft">
                      {rule.status === 'ACTIVE' ? '活跃' : '已暂停'}
                    </Label>
                  </TableCell>
                  <TableCell align="right">{rule.triggerCount}</TableCell>
                  <TableCell>
                    {rule.lastTriggeredAt ? dayjs(rule.lastTriggeredAt).format('MM/DD HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {rule.memo ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => onEdit(rule)}>
                        <Iconify icon="solar:pen-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={rule.status === 'ACTIVE' ? '暂停' : '恢复'}>
                      <IconButton size="small" onClick={() => onToggleStatus(rule)}>
                        <Iconify
                          icon={rule.status === 'ACTIVE' ? 'solar:pause-bold' : 'solar:play-bold'}
                          width={16}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(rule)}>
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>删除预警规则</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定删除股票 <strong>{deleteTarget?.tsCode}</strong> 的
            <strong>「{deleteTarget ? RULE_TYPE_CONFIG[deleteTarget.ruleType].text : ''}」</strong>
            规则？删除后无法恢复。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteTarget) onDelete(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
