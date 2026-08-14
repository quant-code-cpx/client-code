/** @vitest-environment jsdom */

import type { EventSchemaField } from 'src/api/event-study';

import { vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SignalRuleConditionForm } from '../signal-rule-condition-form';

const schemaFields: EventSchemaField[] = [
  { name: 'pChangeMin', label: '预计变动下限', type: 'number', unit: '%' },
  {
    name: 'forecastType',
    label: '预告方向',
    type: 'enum',
    enumValues: [
      { value: 'UP', label: '向上' },
      { value: 'DOWN', label: '向下' },
    ],
  },
  { name: 'summary', label: '摘要', type: 'string' },
  { name: 'annDate', label: '公告日期', type: 'date' },
];

describe('SignalRuleConditionForm', () => {
  it('从后端条件恢复数字、枚举多选与空值，移除后回传完整 AND 条件', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <SignalRuleConditionForm
        schemaFields={schemaFields}
        value={{
          pChangeMin: { gte: 12.5 },
          forecastType: { in: ['UP', 'DOWN'] },
          summary: { contains: null },
        }}
        onChange={onChange}
      />
    );

    expect(screen.getByDisplayValue('12.5')).toHaveAttribute('type', 'number');
    expect(screen.getByText('UP, DOWN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'text');
    expect(screen.getAllByRole('button', { name: '移除条件' })).toHaveLength(3);

    await user.click(screen.getAllByRole('button', { name: '移除条件' })[2]);
    expect(onChange).toHaveBeenLastCalledWith({
      pChangeMin: { gte: 12.5 },
      forecastType: { in: ['UP', 'DOWN'] },
    });
  });

  it('新增条件后可切换字段，枚举多选保持数组而非数值强转', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <SignalRuleConditionForm schemaFields={schemaFields} value={{}} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: '添加条件' }));
    expect(onChange).toHaveBeenLastCalledWith({ pChangeMin: { gte: '' } });

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '预告方向' }));
    expect(onChange).toHaveBeenLastCalledWith({ forecastType: { in: '' } });

    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(screen.getByRole('option', { name: '向上' }));
    await user.click(screen.getByRole('option', { name: '向下' }));
    expect(onChange).toHaveBeenLastCalledWith({ forecastType: { in: ['UP', 'DOWN'] } });
  });

  it('数字字符串转为 number；字符串与日期字段切换时重置运算符和值', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <SignalRuleConditionForm schemaFields={schemaFields} value={{}} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: '添加条件' }));
    const numberInput = screen.getByRole('spinbutton', { name: '值' });
    await user.type(numberInput, '-8.25');
    expect(onChange).toHaveBeenLastCalledWith({ pChangeMin: { gte: -8.25 } });

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '摘要' }));
    expect(onChange).toHaveBeenLastCalledWith({ summary: { eq: '' } });
    await user.type(screen.getByRole('textbox', { name: '值' }), '利润 100');
    expect(onChange).toHaveBeenLastCalledWith({ summary: { eq: '利润 100' } });

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '公告日期' }));
    expect(onChange).toHaveBeenLastCalledWith({ annDate: { gte: '' } });
    await user.type(screen.getByRole('textbox', { name: '值' }), '20260813');
    expect(onChange).toHaveBeenLastCalledWith({ annDate: { gte: 20260813 } });
  });

  it('无 schema 时禁用新增入口', () => {
    renderWithProviders(<SignalRuleConditionForm schemaFields={[]} value={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '添加条件' })).toBeDisabled();
  });
});
