import type {
  ModelConnection,
  ModelDeployment,
  ModelRoutingSummary,
  ModelAdapterDefinition,
} from 'src/api/model-provider';

import { useState, useEffect, useCallback } from 'react';

import {
  listModelAdapters,
  listModelConnections,
  listModelDeployments,
  getModelRoutingSummary,
} from 'src/api/model-provider';

const EMPTY_SUMMARY: ModelRoutingSummary = {
  activeDeployments: 0,
  verifiedConnections: 0,
  failedProbes: 0,
  configurationIssues: 0,
  activeVersion: null,
};

export function useModelProviderConsole(enabled = true) {
  const [adapters, setAdapters] = useState<ModelAdapterDefinition[]>([]);
  const [connections, setConnections] = useState<ModelConnection[]>([]);
  const [deployments, setDeployments] = useState<ModelDeployment[]>([]);
  const [summary, setSummary] = useState<ModelRoutingSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [adapterResult, connectionResult, deploymentResult, summaryResult] = await Promise.all([
        listModelAdapters(),
        listModelConnections(),
        listModelDeployments(),
        getModelRoutingSummary(),
      ]);
      setAdapters(adapterResult.items);
      setConnections(connectionResult.items);
      setDeployments(deploymentResult.items);
      setSummary(summaryResult);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '模型供应商控制台加载失败');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return {
    adapters,
    connections,
    deployments,
    summary,
    loading,
    error,
    setError,
    refresh,
  };
}
