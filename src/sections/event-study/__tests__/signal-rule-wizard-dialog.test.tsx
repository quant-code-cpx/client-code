/** @vitest-environment jsdom */

import type { SignalRule } from 'src/api/event-study';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import {
  getEventSchema,
  createSignalRule,
  updateSignalRule,
  previewSignalRule,
} from 'src/api/event-study';

import { SignalRuleWizardDialog } from '../signal-rule-wizard-dialog';

vi.mock('src/api/event-study', () => ({
  getEventSchema: vi.fn(),
  createSignalRule: vi.fn(),
  updateSignalRule: vi.fn(),
  previewSignalRule: vi.fn(),
}));

vi.mock('../signal-rule-condition-form', () => ({
  SignalRuleConditionForm: ({
    value,
    onChange,
  }: {
    value: Record<string, unknown>;
    onChange: (conditions: Record<string, unknown>) => void;
  }) => (
    <section aria-label="条件构建器">
      <span>当前条件：{JSON.stringify(value)}</span>
      <button type="button" onClick={() => onChange({ pChangeMin: { gte: 20 } })}>
        填入条件
      </button>
    </section>
  ),
}));

const eventTypes = [
  { type: 'FORECAST' as const, label: '业绩预告', description: '业绩预告事件' },
  { type: 'REPURCHASE' as const, label: '股票回购', description: '回购事件' },
];

const editingRule: SignalRule = {
  id: 17,
  userId: 3,
  name: '旧规则',
  description: '旧描述',
  eventType: 'FORECAST',
  conditions: { pChangeMin: { gte: 10 } },
  signalType: 'WATCH',
  status: 'ACTIVE',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
};

describe('SignalRuleWizardDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEventSchema).mockResolvedValue({
      eventType: 'FORECAST',
      fields: [{ name: 'pChangeMin', label: '预计变动下限', type: 'number', unit: '%' }],
    });
    vi.mocked(previewSignalRule).mockResolvedValue({
      matchCount: 2,
      distribution: { '2026-08': 2 },
      samples: [
        { tsCode: '000001.SZ', name: '平安银行', eventDate: '20260808' },
        { tsCode: '600000.SH', name: null, eventDate: '2026-08-09' },
      ],
    });
    vi.mocked(createSignalRule).mockResolvedValue(editingRule);
    vi.mocked(updateSignalRule).mockResolvedValue(editingRule);
  });

  it('逐步校验并以紧凑交易日预览，创建请求保留条件与信号类型', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const { user } = renderWithProviders(
      <SignalRuleWizardDialog
        open
        onClose={onClose}
        onSaved={onSaved}
        editingRule={null}
        eventTypes={eventTypes}
      />
    );

    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('请输入规则名称')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '规则名称 *' }), '  高增长预告  ');
    await user.type(screen.getByRole('textbox', { name: '描述' }), '  关注利润大幅增长  ');
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('请选择事件类型')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '业绩预告' }));
    await user.click(screen.getByRole('button', { name: '卖出' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    expect(getEventSchema).toHaveBeenCalledWith('FORECAST');
    expect(await screen.findByRole('region', { name: '条件构建器' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('请至少添加一个条件')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '填入条件' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    expect(previewSignalRule).toHaveBeenCalledWith({
      eventType: 'FORECAST',
      conditions: { pChangeMin: { gte: 20 } },
      signalType: 'SELL',
    });
    expect(await screen.findByText('000001.SZ · 平安银行 · 2026-08-08')).toBeInTheDocument();
    expect(screen.getByText('600000.SH · - · 2026-08-09')).toBeInTheDocument();
    expect(screen.queryByText(/20260808/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('高增长预告')).toBeInTheDocument();
    expect(screen.getByText('业绩预告')).toBeInTheDocument();
    expect(screen.getByText('卖出')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(createSignalRule).toHaveBeenCalledWith({
        name: '高增长预告',
        description: '关注利润大幅增长',
        eventType: 'FORECAST',
        conditions: { pChangeMin: { gte: 20 } },
        signalType: 'SELL',
      })
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('编辑模式锁定事件类型，只提交可编辑字段并覆盖零命中告警', async () => {
    vi.mocked(previewSignalRule).mockResolvedValue({
      matchCount: 0,
      distribution: {},
      samples: [],
    });
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const { user } = renderWithProviders(
      <SignalRuleWizardDialog
        open
        onClose={onClose}
        onSaved={onSaved}
        editingRule={editingRule}
        eventTypes={eventTypes}
      />
    );

    expect(screen.getByRole('heading', { name: '编辑信号规则' })).toBeInTheDocument();
    await waitFor(() => expect(getEventSchema).toHaveBeenCalledWith('FORECAST'));
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
    await user.clear(screen.getByRole('textbox', { name: '规则名称 *' }));
    await user.type(screen.getByRole('textbox', { name: '规则名称 *' }), '更新规则');
    await user.clear(screen.getByRole('textbox', { name: '描述' }));

    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(await screen.findByText(/pChangeMin/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(await screen.findByText('该条件未命中任何事件，建议放宽阈值后重试。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(updateSignalRule).toHaveBeenCalledWith(17, {
        name: '更新规则',
        description: undefined,
        conditions: { pChangeMin: { gte: 10 } },
        signalType: 'WATCH',
      })
    );
    expect(createSignalRule).not.toHaveBeenCalled();
  });

  it('schema、预览与保存错误保持在向导内且允许返回修正', async () => {
    vi.mocked(getEventSchema).mockRejectedValueOnce(new Error('字段定义不可用'));
    vi.mocked(previewSignalRule).mockRejectedValueOnce(new Error('预览超时'));
    vi.mocked(createSignalRule).mockRejectedValueOnce(new Error('规则名称重复'));
    const { user } = renderWithProviders(
      <SignalRuleWizardDialog
        open
        onClose={vi.fn()}
        onSaved={vi.fn()}
        editingRule={null}
        eventTypes={eventTypes}
      />
    );

    await user.type(screen.getByRole('textbox', { name: '规则名称 *' }), '错误恢复规则');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '业绩预告' }));
    expect(await screen.findByText('字段定义不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一步' }));

    await user.click(screen.getByRole('button', { name: '填入条件' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(await screen.findByText('预览超时')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('规则名称重复')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上一步' }));
    expect(screen.getByRole('button', { name: '下一步' })).toBeInTheDocument();
  });
});
