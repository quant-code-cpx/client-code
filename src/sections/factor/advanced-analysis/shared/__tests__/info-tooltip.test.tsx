/** @vitest-environment jsdom */

import { it, expect, describe } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { InfoTooltip } from '../info-tooltip';

describe('InfoTooltip', () => {
  it('uses a focusable button as the tooltip trigger', async () => {
    const { user } = renderWithProviders(
      <InfoTooltip
        entry={{ title: '因子正交化', oneLiner: '说明', formula: 'F', io: '输入输出' }}
      />
    );
    const trigger = screen.getByRole('button', { name: '查看因子正交化说明' });

    await user.tab();

    expect(trigger).toHaveFocus();
  });
});
