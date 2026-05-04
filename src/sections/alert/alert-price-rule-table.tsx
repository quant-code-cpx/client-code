import type { PriceAlertRule, PriceAlertRuleType } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import DialogContentText from '@mui/material/DialogContentText';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

// ----------------------------------------------------------------------

type RuleTypeConfig = { text: string; color: 'error' | 'success' | 'info' | 'warning' };

const RULE_TYPE_CONFIG: Record<PriceAlertRuleType, RuleTypeConfig> = {
  PCT_CHANGE_UP: { text: '涨幅超过', color: 'error' },
  PCT_CHANGE_DOWN: { text: '跌幅超过', color: 'success' },
  PRICE_ABOVE: { text: '价格高于', color: 'error' },
  PRICE_BELOW: { text: '价格低于', color: 'success' },
  LIMIT_UP: { text: '涨停', color: 'error' },
  LIMIT_DOWN: { text: '跌停', color: 'success' },
  EVENT_DISCLOSURE: { text: '事件:财报披露', color: 'info' },
  EVENT_FLOAT: { text: '事件:限售解禁', color: 'warning' },
  EVENT_DIVIDEND: { text: '事件:除权除息', color: 'success' },
  EVENT_FORECAST: { text: '事件:业绩预告', color: 'info' },
  EVENT_IPO: { text: '事件:新股发行', color: 'info' },
  EVENT_CONVERTIBLE: { text: '事件:可转债', color: 'info' },
  EVENT_SHAREHOLDER: { text: '事件:股东增减持', color: 'error' },
  EVENT_ANY: { text: '事件:全部类型', color: 'info' },
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
      <EmptyContent title="暂无预警规则" description="点击「新建规则」开始设置价格预警" />
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
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除预警规则"
        content={
          <DialogContentText>
            确定删除股票 <strong>{deleteTarget?.tsCode}</strong> 的
            <strong>「{deleteTarget ? RULE_TYPE_CONFIG[deleteTarget.ruleType].text : ''}」</strong>
            规则？删除后无法恢复。
          </DialogContentText>
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        confirmLabel="删除"
      />
    </>
  );
}
