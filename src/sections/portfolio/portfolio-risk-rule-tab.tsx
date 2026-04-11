import type { RiskRule, RiskCheckResult } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { checkRisk, listRiskRules, deleteRiskRule } from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';

import { RiskRuleTable } from './risk-rule-table';
import { RiskCheckResultPanel } from './risk-check-result-panel';
import { RiskRuleUpsertDialog } from './risk-rule-upsert-dialog';
import { ViolationHistoryTable } from './violation-history-table';

// ----------------------------------------------------------------------

interface PortfolioRiskRuleTabProps {
  portfolioId: string;
}

export function PortfolioRiskRuleTab({ portfolioId }: PortfolioRiskRuleTabProps) {
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editRule, setEditRule] = useState<RiskRule | null>(null);

  const [checkResult, setCheckResult] = useState<RiskCheckResult | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await listRiskRules({ portfolioId });
      setRules(res);
    } finally {
      setRulesLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleEdit = (rule: RiskRule) => {
    setEditRule(rule);
    setUpsertOpen(true);
  };

  const handleDelete = async (ruleId: string) => {
    await deleteRiskRule({ ruleId });
    await fetchRules();
  };

  const handleUpsertConfirm = async () => {
    setUpsertOpen(false);
    setEditRule(null);
    await fetchRules();
  };

  const handleCheck = async () => {
    setCheckLoading(true);
    try {
      const res = await checkRisk({ portfolioId });
      setCheckResult(res);
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => {
            setEditRule(null);
            setUpsertOpen(true);
          }}
        >
          新增规则
        </Button>
      </Box>

      <RiskRuleTable
        rules={rules}
        loading={rulesLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          风控检查
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:shield-warning-bold" />}
          onClick={handleCheck}
          disabled={checkLoading}
          loading={checkLoading}
        >
          执行风控检查
        </Button>
      </Box>

      <RiskCheckResultPanel result={checkResult} loading={checkLoading} />

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        历史违规记录
      </Typography>

      <ViolationHistoryTable portfolioId={portfolioId} />

      <RiskRuleUpsertDialog
        open={upsertOpen}
        portfolioId={portfolioId}
        rule={editRule}
        onClose={() => {
          setUpsertOpen(false);
          setEditRule(null);
        }}
        onConfirm={handleUpsertConfirm}
        submitting={false}
      />
    </Box>
  );
}
