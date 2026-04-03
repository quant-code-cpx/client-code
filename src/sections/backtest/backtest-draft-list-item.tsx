import type { StrategyDraft } from 'src/api/strategy-draft';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  draft: StrategyDraft;
  onLoad: () => void;
  onDelete: () => void;
};

export function BacktestDraftListItem({ draft, onLoad, onDelete }: Props) {
  return (
    <>
      <ListItem
        alignItems="flex-start"
        secondaryAction={
          <IconButton
            edge="end"
            size="small"
            color="error"
            onClick={onDelete}
            title="删除草稿"
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        }
        sx={{ pr: 6 }}
      >
        <ListItemText
          primary={
            <Typography variant="body2" fontWeight="fontWeightMedium" noWrap={true}>
              {draft.name}
            </Typography>
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
          fullWidth={true}
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
