import type { StrategyDraft } from 'src/api/strategy-draft';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  draft: StrategyDraft;
  onLoad: () => void;
  onDelete?: () => void;
};

export function BacktestDraftListItem({ draft, onLoad, onDelete }: Props) {
  return (
    <>
      <ListItem
        alignItems="flex-start"
        secondaryAction={
          onDelete ? (
            <Tooltip title="删除草稿">
              <IconButton
                edge="end"
                size="small"
                color="error"
                aria-label={`删除草稿 ${draft.name}`}
                onClick={onDelete}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Tooltip>
          ) : null
        }
        sx={{ pr: 6 }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="fontWeightMedium" noWrap>
                {draft.name}
              </Typography>
              {draft.isAutoSave ? (
                <Label color="info" variant="soft">
                  自动保存
                </Label>
              ) : null}
            </Box>
          }
          secondary={
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              更新于 {fToNow(draft.updatedAt)}
            </Typography>
          }
        />
      </ListItem>
      <Box sx={{ px: 2, pb: 1 }}>
        <Button
          size="small"
          variant="outlined"
          fullWidth
          startIcon={<Iconify icon="solar:import-bold" width={14} />}
          onClick={onLoad}
        >
          加载到工作台
        </Button>
      </Box>
      <Divider />
    </>
  );
}
