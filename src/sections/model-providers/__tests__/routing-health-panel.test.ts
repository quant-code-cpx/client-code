import type { ModelRoutingSummary } from 'src/api/model-provider';

import { it, expect, describe } from 'vitest';

import { hasModelRoutingConfigurationIssue } from '../routing/routing-health-panel';

const HEALTHY_SUMMARY: ModelRoutingSummary = {
  activeDeployments: 1,
  verifiedConnections: 1,
  failedProbes: 0,
  configurationIssues: 0,
  activeVersion: null,
};

describe('hasModelRoutingConfigurationIssue', () => {
  it('reports no issue only when candidates and verified connections are healthy', () => {
    expect(hasModelRoutingConfigurationIssue(HEALTHY_SUMMARY, 1)).toBe(false);
    expect(hasModelRoutingConfigurationIssue(HEALTHY_SUMMARY, 0)).toBe(true);
  });

  it('blocks migrated or inconsistent drafts before the backend rejects them', () => {
    expect(
      hasModelRoutingConfigurationIssue({ ...HEALTHY_SUMMARY, verifiedConnections: 0 }, 2)
    ).toBe(true);
    expect(
      hasModelRoutingConfigurationIssue({ ...HEALTHY_SUMMARY, configurationIssues: 1 }, 2)
    ).toBe(true);
  });
});
