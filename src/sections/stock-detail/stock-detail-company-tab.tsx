import type { StockDetailOverviewData } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

type Props = {
  overview: StockDetailOverviewData | null;
  loading: boolean;
};

type InfoRowProps = { label: string; value: string };

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', width: 140, flexShrink: 0, pr: 2 }}
      >
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function StockDetailCompanyTab({ overview, loading }: Props) {
  const company = overview?.company as Record<string, unknown> | null | undefined;
  const basic = overview?.basic as Record<string, unknown> | null | undefined;

  const str = (v: unknown) => (v != null && v !== '' ? String(v) : '-');

  const introduction = str(company?.introduction ?? company?.bizScope ?? company?.mainBusiness);
  const legalPerson = str(company?.legalPerson ?? company?.legalRep);
  const generalManager = str(company?.generalManager ?? company?.chairman);
  const employees = str(company?.employees ?? company?.empNum);
  const established = str(
    company?.establishedDate ?? company?.setupDate ?? basic?.listDate
  );
  const registered = str(company?.registeredCapital ?? company?.regCapital);
  const province = str(company?.province ?? basic?.area);
  const city = str(company?.city);
  const address = str(company?.address ?? company?.officeAddr);
  const website = str(company?.website);
  const email = str(company?.email);
  const phone = str(company?.phone);
  const orgType = str(company?.orgType);
  const exchangeCode = str(company?.exchange ?? basic?.exchange);

  return (
    <Box>
      {/* 公司简介 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            公司简介
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {loading ? (
            <Box sx={{ color: 'text.secondary' }}>
              <Typography variant="body2">加载中...</Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
              {introduction}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 基本信息 */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            基本信息
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <InfoRow label="法定代表人" value={legalPerson} />
          <InfoRow label="总经理 / 董事长" value={generalManager} />
          <InfoRow label="员工人数" value={employees} />
          <InfoRow label="成立日期" value={established} />
          <InfoRow label="注册资本(万元)" value={registered} />
          <InfoRow label="机构类型" value={orgType} />
          <InfoRow label="所在交易所" value={exchangeCode} />
          <InfoRow label="省份" value={province} />
          <InfoRow label="城市" value={city} />
          <InfoRow label="注册地址" value={address} />
          <InfoRow label="官网" value={website} />
          <InfoRow label="邮箱" value={email} />
          <InfoRow label="电话" value={phone} />
        </CardContent>
      </Card>
    </Box>
  );
}
