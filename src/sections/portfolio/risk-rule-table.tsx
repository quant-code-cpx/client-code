import type { RiskRule } from 'src/api/portfolio';

import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { RULE_TYPE_LABEL, RULE_TYPE_COLOR } from './constants';

// ----------------------------------------------------------------------

interface RiskRuleTableProps {
  rules: RiskRule[];
  loading: boolean;
  onEdit: (rule: RiskRule) => void;
  onDelete: (ruleId: string) => void;
}

export function RiskRuleTable({ rules, loading, onEdit, onDelete }: RiskRuleTableProps) {
  if (loading) {
    return <Skeleton variant="rectangular" height={200} />;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>规则类型</TableCell>
            <TableCell align="right">阈值</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>备注</TableCell>
            <TableCell>更新时间</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id} hover>
              <TableCell>
                <Label color={RULE_TYPE_COLOR[rule.ruleType] ?? 'default'}>
                  {RULE_TYPE_LABEL[rule.ruleType] ?? rule.ruleType}
                </Label>
              </TableCell>
              <TableCell align="right">{(rule.threshold * 100).toFixed(0)}%</TableCell>
              <TableCell>
                <Label color={rule.isEnabled ? 'success' : 'default'}>
                  {rule.isEnabled ? '启用' : '禁用'}
                </Label>
              </TableCell>
              <TableCell>{rule.memo ?? '-'}</TableCell>
              <TableCell>{fDate(rule.updatedAt, 'YYYY-MM-DD')}</TableCell>
              <TableCell align="center">
                <Button size="small" onClick={() => onEdit(rule)}>
                  编辑
                </Button>
                <Button size="small" color="error" onClick={() => onDelete(rule.id)}>
                  删除
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rules.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                暂无风控规则
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
