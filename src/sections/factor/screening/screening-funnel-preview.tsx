import type { FactorDef, FactorScreeningConditionPassCount } from 'src/api/factor';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

type Props = {
  data: FactorScreeningConditionPassCount[] | undefined;
  allFactors: FactorDef[];
};

const tabularNum = { fontVariantNumeric: 'tabular-nums' as const };

export function ScreeningFunnelPreview({ data, allFactors }: Props) {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            条件命中漏斗
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            后端 BE-3 未上线，无法展示每条条件的命中数量。运行选股后此区域将自动启用。
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const maxBefore = Math.max(...data.map((d) => d.beforeCount), 1);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          条件命中漏斗
        </Typography>
        <Stack spacing={1.5}>
          {data.map((item, idx) => {
            const factorLabel =
              allFactors.find((f) => f.name === item.factorName)?.label ?? item.factorName;
            const beforeRatio = item.beforeCount / maxBefore;
            const passRatio = item.beforeCount > 0 ? item.passCount / item.beforeCount : 0;
            const cutCount = item.beforeCount - item.passCount;

            return (
              <Box key={`${item.factorName}-${idx}`}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {idx + 1}. {factorLabel}{' '}
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      · {item.operator}
                    </Box>
                  </Typography>
                  <Typography variant="caption" sx={{ ...tabularNum, color: 'text.secondary' }}>
                    {item.beforeCount} → {item.passCount}（剔除 {cutCount}，缺失 {item.missingCount}
                    ）
                  </Typography>
                </Stack>
                <Tooltip
                  title={
                    item.threshold !== null && item.threshold !== undefined
                      ? `实际阈值：${item.threshold}`
                      : '阈值由用户输入'
                  }
                >
                  <Box
                    sx={{
                      position: 'relative',
                      height: 10,
                      borderRadius: 1,
                      bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: `${beforeRatio * 100}%`,
                        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.18),
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${beforeRatio * passRatio * 100}%`,
                        bgcolor: 'primary.main',
                      }}
                    />
                  </Box>
                </Tooltip>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
