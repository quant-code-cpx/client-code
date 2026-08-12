import type { EventType } from 'src/api/event-study';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { EVENT_TYPE_LABELS } from '../constants';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  eventType: EventType | string;
  detail: Record<string, unknown> | null;
  title?: string;
};

const FIELD_LABELS: Record<string, string> = {
  // snake_case（兼容旧格式）
  ts_code: '股票代码',
  name: '股票名称',
  ann_date: '公告日期',
  end_date: '报告期',
  ex_date: '除权除息日',
  float_date: '解禁日期',
  exp_date: '到期日期',
  type: '预告类型',
  p_change_min: '预计变动幅度下限(%)',
  p_change_max: '预计变动幅度上限(%)',
  summary: '摘要',
  holder_name: '股东名称',
  change_vol: '变动数量(万股)',
  change_ratio: '变动比例(%)',
  cash_div: '每股派息(元)',
  stk_div: '每股送转',
  float_share: '解禁数量(万股)',
  float_ratio: '解禁比例(%)',
  vol: '回购数量(万股)',
  amount: '回购金额(万元)',
  audit_result: '审计结果',
  audit_agency: '审计机构',
  report_type: '报告类型',
  industry: '所属行业',
  // camelCase（API 返回格式）
  tsCode: '股票代码',
  stockName: '股票名称',
  annDate: '公告日期',
  endDate: '报告期',
  exDate: '除权除息日',
  floatDate: '解禁日期',
  expDate: '到期日期',
  pChangeMin: '预计变动幅度下限(%)',
  pChangeMax: '预计变动幅度上限(%)',
  holderName: '股东名称',
  changeVol: '变动数量(万股)',
  changeRatio: '变动比例(%)',
  cashDiv: '每股派息(元)',
  stkDiv: '每股送转',
  floatShare: '解禁数量(万股)',
  floatRatio: '解禁比例(%)',
  auditResult: '审计结果',
  auditAgency: '审计机构',
  reportType: '报告类型',
  netProfitMin: '净利润下限(万元)',
  netProfitMax: '净利润上限(万元)',
  lastParentNet: '上期归母净利润(万元)',
  firstAnnDate: '首次公告日期',
  changeReason: '变动原因',
  syncedAt: '同步时间',
};

// 检测 ISO 日期字符串并格式化为 YYYY-MM-DD
function formatFieldValue(value: unknown): string {
  if (value == null) return '-';
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.slice(0, 10);
  }
  return str;
}

export function EventDetailDrawer({ open, onClose, eventType, detail, title }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title ?? '事件详情'}
          </Typography>
          <Label color="default" sx={{ mt: 0.5 }}>
            {EVENT_TYPE_LABELS[eventType as EventType] ?? eventType}
          </Label>
        </Box>
        <Tooltip title="关闭">
          <IconButton onClick={onClose} size="small" aria-label="关闭">
            <Iconify icon="solar:close-circle-bold" width={20} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        {!detail ? (
          <Typography variant="body2" color="text.secondary">
            暂无字段
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {Object.entries(detail).map(([key, value]) => (
              <Stack key={key} direction="row" spacing={2} alignItems="flex-start">
                <Typography
                  variant="caption"
                  sx={{ minWidth: 120, color: 'text.secondary', fontWeight: 500 }}
                >
                  {FIELD_LABELS[key] ?? key}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                  {formatFieldValue(value)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
