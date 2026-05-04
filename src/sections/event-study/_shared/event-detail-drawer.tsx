import type { EventType } from 'src/api/event-study';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
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
};

export function EventDetailDrawer({ open, onClose, eventType, detail, title }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
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
        <IconButton onClick={onClose} size="small">
          <Iconify icon="solar:close-circle-bold" width={20} />
        </IconButton>
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
                  {value == null ? '-' : String(value)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
