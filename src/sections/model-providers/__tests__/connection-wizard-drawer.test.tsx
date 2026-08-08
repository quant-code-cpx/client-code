import type { ModelConnection, ModelAdapterDefinition } from 'src/api/model-provider';

import { render, screen, fireEvent } from '@testing-library/react';

import { ConnectionWizardDrawer } from '../connections/connection-wizard-drawer';

const ADAPTERS: ModelAdapterDefinition[] = [
  {
    kind: 'openai-responses',
    label: 'OpenAI Responses',
    transport: 'RESPONSES',
    native: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    reasoningModes: ['AUTO', 'DISABLED', 'EFFORT'],
    builtInEfforts: ['LOW', 'MEDIUM', 'HIGH'],
    capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING'],
    probeLevels: ['AUTH', 'STREAM'],
    summary: 'OpenAI Responses 原生协议',
  },
  {
    kind: 'anthropic-messages',
    label: 'Anthropic Messages',
    transport: 'MESSAGES',
    native: true,
    defaultBaseUrl: 'https://api.anthropic.com',
    reasoningModes: ['AUTO', 'DISABLED', 'TOKEN_BUDGET'],
    builtInEfforts: [],
    capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING'],
    probeLevels: ['AUTH', 'STREAM'],
    summary: 'Anthropic Messages 原生协议',
  },
];

const CONNECTION: ModelConnection = {
  id: 'connection-1',
  connectionKey: 'fishxcode',
  adapterKind: 'anthropic-messages',
  displayName: 'fishxcode',
  baseUrl: 'https://api.fishxcode.com/v1',
  apiKeyConfigured: true,
  apiKeyLastFour: 'test',
  enabled: true,
  version: 1,
  deploymentCount: 1,
  lastProbe: null,
  createdAt: '2026-08-07T12:00:00.000Z',
  updatedAt: '2026-08-07T12:00:00.000Z',
};

describe('ConnectionWizardDrawer', () => {
  it('用户填写自定义 Base URL 后切换协议时保留原值', async () => {
    renderWizard();

    fireEvent.click(await screen.findByRole('button', { name: /OpenAI Responses/ }));
    const baseUrl = screen.getByRole('textbox', { name: 'Base URL' });
    fireEvent.change(baseUrl, { target: { value: 'https://gateway.example.com/v1' } });

    fireEvent.change(screen.getByRole('combobox', { name: '协议适配器' }), {
      target: { value: 'anthropic-messages' },
    });

    expect(baseUrl).toHaveValue('https://gateway.example.com/v1');
  });

  it('新建连接尚未编辑 URL 时按所选协议更新建议默认值', async () => {
    renderWizard();

    fireEvent.click(await screen.findByRole('button', { name: /OpenAI Responses/ }));
    const baseUrl = screen.getByRole('textbox', { name: 'Base URL' });
    expect(baseUrl).toHaveValue('https://api.openai.com/v1');

    fireEvent.change(screen.getByRole('combobox', { name: '协议适配器' }), {
      target: { value: 'anthropic-messages' },
    });

    expect(baseUrl).toHaveValue('https://api.anthropic.com');
  });

  it('编辑已有连接时切换协议不会覆盖已保存 URL', async () => {
    renderWizard(CONNECTION);

    const baseUrl = await screen.findByRole('textbox', { name: 'Base URL' });
    fireEvent.change(screen.getByRole('combobox', { name: '协议适配器' }), {
      target: { value: 'openai-responses' },
    });

    expect(baseUrl).toHaveValue(CONNECTION.baseUrl);
  });
});

function renderWizard(connection?: ModelConnection) {
  return render(
    <ConnectionWizardDrawer
      open
      connection={connection}
      adapters={ADAPTERS}
      onClose={vi.fn()}
      onChanged={vi.fn().mockResolvedValue(undefined)}
    />
  );
}
