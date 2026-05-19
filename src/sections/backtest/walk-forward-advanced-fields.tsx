import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  purgeDays: number;
  embargoDays: number;
  minOosTrades: number;
  onChange: (patch: { purgeDays?: number; embargoDays?: number; minOosTrades?: number }) => void;
};

export function WalkForwardAdvancedFields({
  purgeDays,
  embargoDays,
  minOosTrades,
  onChange,
}: Props) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2">防泄漏与最小样本约束</Typography>
        <Typography variant="caption" color="text.secondary">
          Purge / Embargo 用于隔离样本内外边界，降低标签重叠与信息泄漏风险。
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="number"
          label="净化天数"
          value={purgeDays}
          onChange={(event) => onChange({ purgeDays: Number(event.target.value) })}
          helperText="样本内结束后跳过的隔离天数"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="number"
          label="禁用天数"
          value={embargoDays}
          onChange={(event) => onChange({ embargoDays: Number(event.target.value) })}
          helperText="样本外开始前额外禁用的观察期"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="number"
          label="最少 OOS 成交数"
          value={minOosTrades}
          onChange={(event) => onChange({ minOosTrades: Number(event.target.value) })}
          helperText="不足时窗口标记为待复核"
        />
      </Grid>
    </Grid>
  );
}
