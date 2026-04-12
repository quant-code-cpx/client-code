import type { StockConceptItem, StockDetailOverviewData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { stockDetailApiExtra } from 'src/api/stock';

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
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

export function StockDetailCompanyTab({ tsCode, overview, loading }: Props) {
  const [concepts, setConcepts] = useState<StockConceptItem[]>([]);

  const fetchConcepts = useCallback(async () => {
    if (!tsCode) return;
    try {
      const res = await stockDetailApiExtra.concepts(tsCode);
      setConcepts(res.concepts ?? []);
    } catch {
      // ignore
    }
  }, [tsCode]);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);
  const company = overview?.company;
  const basic = overview?.basic;

  const str = (v: unknown) => (v != null && v !== '' ? String(v) : '-');

  const introduction = str(company?.introduction ?? company?.mainBusiness);
  const legalPerson = str(company?.chairman);
  const generalManager = str(company?.manager ?? company?.chairman);
  const employees = str(company?.employees);
  const established = str(basic?.listDate);
  const registered = str(company?.regCapital);
  const province = str(company?.province ?? basic?.area);
  const city = str(company?.city);
  const address = '-';
  const website = str(company?.website);
  const email = '-';
  const phone = '-';
  const orgType = '-';
  const exchangeCode = str(basic?.exchange);

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

      {/* 所属概念板块 */}
      {concepts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              所属概念板块
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {concepts.map((c) => (
                <Chip
                  key={c.conceptCode}
                  label={c.conceptName}
                  size="small"
                  color={
                    c.pctChange != null && c.pctChange > 0
                      ? 'error'
                      : c.pctChange != null && c.pctChange < 0
                        ? 'success'
                        : 'default'
                  }
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

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
