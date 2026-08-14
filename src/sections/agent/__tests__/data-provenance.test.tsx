import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { DataProvenance } from '../components/data-provenance';

describe('DataProvenance', () => {
  it('将八位交易日格式化为可读日期', () => {
    renderWithProviders(
      <DataProvenance
        provenance={{
          sourceType: 'MODEL_INFERENCE',
          citationIds: [],
          asOf: { tradeDate: '20260812', retrievedAt: '2026-08-13T00:00:00.000Z' },
          timezone: 'Asia/Shanghai',
        }}
      />
    );

    expect(screen.getByText('交易日 2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText(/20260812/)).not.toBeInTheDocument();
  });

  it('将时区和旧工作流告警码转换为中文数据提示', () => {
    renderWithProviders(
      <DataProvenance
        provenance={{
          sourceType: 'MODEL_INFERENCE',
          citationIds: [],
          asOf: { retrievedAt: '2026-08-05T15:11:00.000Z' },
          timezone: 'Asia/Shanghai',
          qualityFlags: ['WORKFLOW_WARNING_1', 'WORKFLOW_WARNING_2'],
        }}
      />
    );

    expect(screen.getByText('研究结论整合')).toBeInTheDocument();
    expect(screen.getByText('时区 中国标准时间')).toBeInTheDocument();
    expect(screen.getByText('数据提示：本回答包含数据限制，具体说明见正文“数据限制”。')).toBeInTheDocument();
    expect(screen.queryByText('WORKFLOW_WARNING_1')).not.toBeInTheDocument();
  });
});
