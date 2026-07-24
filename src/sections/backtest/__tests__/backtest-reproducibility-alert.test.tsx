import { render, screen } from '@testing-library/react';

import { BacktestReproducibilityAlert } from '../backtest-reproducibility-alert';

const verifiedVersions = {
  engineVersion: 'backtest-engine-pit-v2',
  dataContractVersion: 'backtest-data-contract-v2',
  universePolicyVersion: 'pit-universe-v1',
  financialAsOfPolicyVersion: 'announcement-date-update-flag-v2',
  adjustmentPolicyVersion: 'tushare-qfq-v1',
};
const verifiedManifest = {
  ...verifiedVersions,
  inputHash: 'a'.repeat(64),
  universeSnapshots: [
    {
      date: '2020-01-02',
      source: 'ALL_A',
      version: 'pit-universe-v1',
      hash: 'b'.repeat(64),
      memberCount: 2,
    },
  ],
  qualityFlags: [],
};

describe('BacktestReproducibilityAlert', () => {
  it('完整 VERIFIED 契约显示可信状态及五类版本', () => {
    render(
      <BacktestReproducibilityAlert
        {...verifiedVersions}
        reproducibilityStatus="VERIFIED"
        reproducibilityManifest={verifiedManifest}
        qualityFlags={[]}
      />
    );

    expect(screen.getByText('结果已通过可复现性校验')).toBeInTheDocument();
    expect(screen.getByText('引擎：backtest-engine-pit-v2')).toBeInTheDocument();
    expect(screen.getByText('复权：tushare-qfq-v1')).toBeInTheDocument();
  });

  it('legacy Run 显示偏差警告及质量标记', () => {
    render(
      <BacktestReproducibilityAlert
        reproducibilityStatus="LEGACY_UNVERIFIED"
        qualityFlags={['LEGACY_UNVERIFIED']}
      />
    );

    expect(screen.getByText('旧回测或可信元数据不完整')).toBeInTheDocument();
    expect(screen.getByText(/幸存者偏差/)).toBeInTheDocument();
    expect(screen.getByText('质量标记：LEGACY_UNVERIFIED')).toBeInTheDocument();
  });

  it('PENDING 不误标为可信；VERIFIED 缺版本也 fail closed', () => {
    const { rerender } = render(
      <BacktestReproducibilityAlert
        {...verifiedVersions}
        reproducibilityStatus="PENDING"
        reproducibilityManifest={verifiedManifest}
        qualityFlags={[]}
      />
    );

    expect(screen.getByText('可复现性校验尚未完成')).toBeInTheDocument();

    rerender(
      <BacktestReproducibilityAlert
        {...verifiedVersions}
        adjustmentPolicyVersion={null}
        reproducibilityStatus="VERIFIED"
        reproducibilityManifest={verifiedManifest}
        qualityFlags={[]}
      />
    );

    expect(screen.getByText('旧回测或可信元数据不完整')).toBeInTheDocument();
    expect(screen.getByText('复权：缺失')).toBeInTheDocument();
  });

  it('VERIFIED 缺 manifest 或带质量标记仍显示警告', () => {
    const { rerender } = render(
      <BacktestReproducibilityAlert
        {...verifiedVersions}
        reproducibilityStatus="VERIFIED"
        qualityFlags={[]}
      />
    );

    expect(screen.getByText('旧回测或可信元数据不完整')).toBeInTheDocument();

    rerender(
      <BacktestReproducibilityAlert
        {...verifiedVersions}
        reproducibilityStatus="VERIFIED"
        reproducibilityManifest={verifiedManifest}
        qualityFlags={['ADJUSTMENT_GAP']}
      />
    );

    expect(screen.getByText('旧回测或可信元数据不完整')).toBeInTheDocument();
    expect(screen.getByText('质量标记：ADJUSTMENT_GAP')).toBeInTheDocument();
  });
});
