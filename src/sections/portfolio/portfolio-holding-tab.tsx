import type { HoldingDetailItem, AddHoldingRequest, UpdateHoldingRequest } from 'src/api/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import { addHolding, removeHolding, updateHolding } from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';

import { HoldingAddDialog } from './holding-add-dialog';
import { HoldingEditDialog } from './holding-edit-dialog';
import { PortfolioHoldingTable } from './portfolio-holding-table';

// ----------------------------------------------------------------------

interface PortfolioHoldingTabProps {
  portfolioId: string;
  holdings: HoldingDetailItem[];
  onRefresh: () => void;
}

export function PortfolioHoldingTab({ portfolioId, holdings, onRefresh }: PortfolioHoldingTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editHolding, setEditHolding] = useState<HoldingDetailItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteHolding, setDeleteHolding] = useState<HoldingDetailItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleAdd = async (data: AddHoldingRequest) => {
    setAddSubmitting(true);
    try {
      await addHolding(data);
      setAddOpen(false);
      onRefresh();
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdateHoldingRequest) => {
    setEditSubmitting(true);
    try {
      await updateHolding(data);
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
      await removeHolding({ holdingId: deleteHolding.id });
      setDeleteHolding(null);
      onRefresh();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => setAddOpen(true)}
        >
          添加持仓
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
          <Button onClick={() => setDeleteHolding(null)} disabled={deleteSubmitting}>
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
    </Box>
  );
}
