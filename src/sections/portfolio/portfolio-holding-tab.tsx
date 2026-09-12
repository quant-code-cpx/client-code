import type { AddHoldingInput, HoldingDetailItem, UpdateHoldingInput } from 'src/api/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import {
  addHolding,
  removeHolding,
  updateHolding,
  createHoldingMutationIdempotencyKey,
} from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';

import { HoldingAddDialog } from './holding-add-dialog';
import { HoldingEditDialog } from './holding-edit-dialog';
import { PortfolioTradeDialog } from './portfolio-trade-dialog';
import { PortfolioHoldingTable } from './portfolio-holding-table';
import { PortfolioRebalanceDialog } from './portfolio-rebalance-dialog';

// ----------------------------------------------------------------------

interface PortfolioHoldingTabProps {
  portfolioId: string;
  holdings: HoldingDetailItem[];
  onRefresh: () => void;
}

export function PortfolioHoldingTab({
  portfolioId,
  holdings,
  onRefresh,
}: PortfolioHoldingTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  const [rebalanceOpen, setRebalanceOpen] = useState(false);

  const [editHolding, setEditHolding] = useState<HoldingDetailItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteHolding, setDeleteHolding] = useState<HoldingDetailItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleAdd = async (data: AddHoldingInput) => {
    setAddSubmitting(true);
    try {
      await addHolding({ ...data, idempotencyKey: createHoldingMutationIdempotencyKey('add') });
      setAddOpen(false);
      onRefresh();
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdateHoldingInput) => {
    setEditSubmitting(true);
    try {
      await updateHolding({
        ...data,
        idempotencyKey: createHoldingMutationIdempotencyKey('update'),
      });
      setEditHolding(null);
      onRefresh();
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteHolding) return;
    setDeleteSubmitting(true);
    try {
      await removeHolding({
        holdingId: deleteHolding.id,
        idempotencyKey: createHoldingMutationIdempotencyKey('remove'),
      });
      setDeleteHolding(null);
      onRefresh();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        买卖请使用“记录成交”，系统会同时记录持仓、现金、费用和已实现盈亏。直接编辑、删除或校正持仓只用于历史数据修正，会标记为估算口径。
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:refresh-bold" />}
          onClick={() => setRebalanceOpen(true)}
        >
          生成调仓计划
        </Button>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => setAddOpen(true)}
        >
          持仓校正
        </Button>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:document-add-bold" />}
          onClick={() => setTradeOpen(true)}
        >
          记录成交
        </Button>
      </Box>

      <PortfolioHoldingTable
        holdings={holdings}
        onEdit={(h) => setEditHolding(h)}
        onDelete={(h) => setDeleteHolding(h)}
      />

      <HoldingAddDialog
        open={addOpen}
        portfolioId={portfolioId}
        onClose={() => setAddOpen(false)}
        onConfirm={handleAdd}
        submitting={addSubmitting}
      />

      <PortfolioTradeDialog
        open={tradeOpen}
        portfolioId={portfolioId}
        holdings={holdings}
        onClose={() => setTradeOpen(false)}
        onSuccess={onRefresh}
      />

      <HoldingEditDialog
        open={Boolean(editHolding)}
        holding={editHolding}
        onClose={() => setEditHolding(null)}
        onConfirm={handleEdit}
        submitting={editSubmitting}
      />

      <Dialog
        open={Boolean(deleteHolding)}
        onClose={!deleteSubmitting ? () => setDeleteHolding(null) : undefined}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除 <strong>{deleteHolding?.stockName}</strong> 的持仓吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeleteHolding(null)}
            disabled={deleteSubmitting}
          >
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteSubmitting}
            loading={deleteSubmitting}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <PortfolioRebalanceDialog
        open={rebalanceOpen}
        onClose={() => setRebalanceOpen(false)}
        portfolioId={portfolioId}
        holdings={holdings}
      />
    </Box>
  );
}
