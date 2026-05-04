import type { AuditLogDetails } from 'src/api/user-manage';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';

import { getAuditChanges, stringifyAuditValue } from './user-manage-utils';

// ----------------------------------------------------------------------

type AuditLogDetailDiffProps = {
  details: AuditLogDetails | null;
};

export function AuditLogDetailDiff({ details }: AuditLogDetailDiffProps) {
  const changes = getAuditChanges(details);

  if (changes.length === 0) {
    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          fontSize: 12,
          maxHeight: 240,
          overflow: 'auto',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        {JSON.stringify(details, null, 2)}
      </Box>
    );
  }

  return (
    <Box>
      {details?.reason && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          原因：{details.reason}
        </Typography>
      )}
      <Table size="small" sx={{ maxWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 160 }}>字段</TableCell>
            <TableCell>旧值</TableCell>
            <TableCell>新值</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {changes.map((item) => (
            <TableRow key={item.field}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.field}</TableCell>
              <TableCell sx={{ color: 'text.disabled' }}>
                {stringifyAuditValue(item.before)}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{stringifyAuditValue(item.after)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
