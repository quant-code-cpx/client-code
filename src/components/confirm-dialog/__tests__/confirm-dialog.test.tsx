/** @vitest-environment jsdom */

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ConfirmDialog } from '../confirm-dialog';

describe('ConfirmDialog', () => {
  const renderDialog = (submitting = false) => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    renderWithProviders(
      <ConfirmDialog
        open
        title="删除策略"
        content="此操作不可恢复"
        onClose={onClose}
        onConfirm={onConfirm}
        submitting={submitting}
        confirmLabel="删除"
      />
    );

    return { onClose, onConfirm };
  };

  it('uses neutral cancel and error confirmation button hierarchy', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: '取消' })).toHaveClass('MuiButton-colorInherit');
    expect(screen.getByRole('button', { name: '删除' })).toHaveClass('MuiButton-containedError');
  });

  it('disables both actions while submitting', () => {
    renderDialog(true);

    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled();
  });
});
