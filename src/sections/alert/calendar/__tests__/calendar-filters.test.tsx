import { screen } from '@testing-library/react';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { renderWithProviders } from 'src/test/test-utils';

import { CalendarFilters } from '../calendar-filters';
import { DEFAULT_FILTERS, createCalendarDateRange } from '../types';

describe('事件日历筛选栏 v3', () => {
  it('保留完整筛选入口且 CAL-B14 统一使用“未来一周”', () => {
    renderWithProviders(
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CalendarFilters
          filters={{ ...DEFAULT_FILTERS, ...createCalendarDateRange(14) }}
          onChange={vi.fn()}
          onReset={vi.fn()}
          onRefresh={vi.fn()}
        />
      </LocalizationProvider>
    );

    expect(screen.getAllByLabelText('开始日期').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('结束日期').length).toBeGreaterThan(0);
    ['今天', '未来一周', '14天', '30天'].forEach((label) =>
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    );
    expect(screen.queryByText('本周')).not.toBeInTheDocument();
    ['月历', '时间线', '表格', '全市场', '自选股', '持仓组合', '刷新', '重置'].forEach(
      (label) => expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    );
    ['财报披露', '业绩预告', '除权除息', '限售解禁', '新股发行', '可转债', '股东增减持'].forEach(
      (label) => expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    );
    expect(screen.getByRole('group', { name: '事件影响力' })).toBeInTheDocument();
  });

  it('关键词输入与快捷范围继续即时提交，不引入 Apply 状态', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CalendarFilters
          filters={{ ...DEFAULT_FILTERS, ...createCalendarDateRange(14) }}
          onChange={onChange}
          onReset={vi.fn()}
          onRefresh={vi.fn()}
        />
      </LocalizationProvider>
    );

    await user.type(screen.getByLabelText('搜索股票或标题'), '银行');
    expect(onChange).toHaveBeenCalledWith({ keyword: '银' });
    await user.click(screen.getByRole('button', { name: '未来一周' }));
    expect(onChange).toHaveBeenCalledWith(createCalendarDateRange(7));
    expect(screen.queryByRole('button', { name: /应用|Apply|取消筛选/ })).not.toBeInTheDocument();
  });
});
