import type { IndustryMappingIndexes } from 'src/utils/industry-mapping';
import type { IndustryDictMappingItem, IndustryDictMappingCoverage } from 'src/api/industry-dict';

import { useRef, useState, useEffect, useCallback } from 'react';

import { buildIndustryMappingIndexes } from 'src/utils/industry-mapping';

import { fetchIndustryDictMapping } from 'src/api/industry-dict';

// ── Module-level cache (persists for the session, no React Query) ──

let cachedItems: IndustryDictMappingItem[] | undefined;
let cachedCoverage: IndustryDictMappingCoverage | undefined;
let cachedIndexes: IndustryMappingIndexes | undefined;
let fetchPromise: Promise<void> | null = null;

function loadDictMapping(): Promise<void> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetchIndustryDictMapping()
    .then((res) => {
      cachedItems = res?.items ?? [];
      cachedCoverage = res?.coverage ?? undefined;
      cachedIndexes = buildIndustryMappingIndexes(cachedItems);
    })
    .catch(() => {
      // Keep previous cache if exists; mark as failed on first attempt
      if (!cachedItems) {
        cachedItems = [];
        cachedCoverage = undefined;
        cachedIndexes = undefined;
      }
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

// ── Hook ────────────────────────────────────────────────────────

export type UseIndustryDictMappingResult = {
  items: IndustryDictMappingItem[] | undefined;
  indexes: IndustryMappingIndexes | null;
  coverage: IndustryDictMappingCoverage | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  refetch: () => void;
};

export function useIndustryDictMapping(): UseIndustryDictMappingResult {
  const [items, setItems] = useState<IndustryDictMappingItem[] | undefined>(cachedItems);
  const [coverage, setCoverage] = useState<IndustryDictMappingCoverage | undefined>(cachedCoverage);
  const [indexes, setIndexes] = useState<IndustryMappingIndexes | null>(cachedIndexes ?? null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    cachedItems ? 'success' : 'idle'
  );

  const mountedRef = useRef(true);

  const load = useCallback(() => {
    // Already cached
    if (cachedItems) {
      setItems(cachedItems);
      setCoverage(cachedCoverage);
      setIndexes(cachedIndexes ?? null);
      setStatus('success');
      return;
    }

    setStatus('loading');
    loadDictMapping()
      .then(() => {
        if (!mountedRef.current) return;
        setItems(cachedItems);
        setCoverage(cachedCoverage);
        setIndexes(cachedIndexes ?? null);
        setStatus(cachedItems && cachedItems.length > 0 ? 'success' : 'error');
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const refetch = useCallback(() => {
    // Clear cache and reload
    cachedItems = undefined;
    cachedCoverage = undefined;
    cachedIndexes = undefined;
    fetchPromise = null;
    load();
  }, [load]);

  return { items, indexes, coverage: coverage ?? null, status, refetch };
}
