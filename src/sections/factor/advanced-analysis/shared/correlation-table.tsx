import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import { useTheme, type Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------
// 相关性矩阵热力图
//   颜色梯度按 |r|：≥0.7 强（error）/ 0.4-0.7 中（warning）/ 0.2-0.4 弱（info）/ <0.2 弱化（grey）
//   走 theme channel + varAlpha，自动适配双主题
// ----------------------------------------------------------------------

type Props = {
  factors: string[];
  matrix: number[][];
};

function getCellChannel(theme: Theme, abs: number): { channel: string; intensity: number } {
  if (abs >= 0.7) return { channel: theme.vars.palette.error.mainChannel, intensity: 0.32 };
  if (abs >= 0.4) return { channel: theme.vars.palette.warning.mainChannel, intensity: 0.22 };
  if (abs >= 0.2) return { channel: theme.vars.palette.info.mainChannel, intensity: 0.16 };
  return { channel: theme.vars.palette.grey['500Channel'], intensity: 0.04 };
}

export function CorrelationTable({ factors, matrix }: Props) {
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              {factors.map((f) => (
                <TableCell
                  key={f}
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  {f}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {factors.map((rowF, ri) => (
              <TableRow key={rowF}>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                  {rowF}
                </TableCell>
                {(matrix[ri] ?? []).map((val, ci) => {
                  const abs = Math.abs(val);
                  const { channel, intensity } = getCellChannel(theme, abs);
                  return (
                    <TableCell
                      key={ci}
                      align="center"
                      sx={{
                        bgcolor: varAlpha(channel, intensity),
                        fontSize: 12,
                        fontFeatureSettings: '"tnum"',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {val.toFixed(3)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* 图例 */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          |r| 强度
        </Typography>
        <LegendDot label="<0.2" channel={theme.vars.palette.grey['500Channel']} intensity={0.04} />
        <LegendDot label="0.2-0.4" channel={theme.vars.palette.info.mainChannel} intensity={0.16} />
        <LegendDot
          label="0.4-0.7"
          channel={theme.vars.palette.warning.mainChannel}
          intensity={0.22}
        />
        <LegendDot label="≥0.7" channel={theme.vars.palette.error.mainChannel} intensity={0.32} />
      </Stack>
    </Box>
  );
}

function LegendDot({
  label,
  channel,
  intensity,
}: {
  label: string;
  channel: string;
  intensity: number;
}) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: 0.5,
          bgcolor: varAlpha(channel, intensity),
          border: (t) => `1px solid ${varAlpha(t.vars.palette.grey['500Channel'], 0.16)}`,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
