import { useRef, useMemo, useState, useEffect } from 'react';

import { agentApi } from 'src/api/agent';

import { parseAgentSseEvent } from 'src/types/agent/generated';

import { AGENT_THINKING_EVENT_TYPES } from '../state/agent-state.types';

import type { AgentRunEvent, AgentThinkingEvent } from '../state/agent-state.types';

const PAGE_SIZE = 100;

type RunEventPage = {
  items: AgentRunEvent[];
  nextAfterSequence: number | null;
};

type RunEventState = RunEventPage & {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  partial: boolean;
};

const EMPTY_STATE: RunEventState = {
  items: [],
  nextAfterSequence: null,
  loaded: false,
  loading: false,
  error: null,
  partial: false,
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function eventPage(input: unknown): RunEventPage {
  if (!isRecord(input) || !Array.isArray(input.items)) {
    throw new Error('Run 事件历史响应无效');
  }
  const { nextAfterSequence } = input;
  if (
    nextAfterSequence !== null &&
    (typeof nextAfterSequence !== 'number' ||
      !Number.isSafeInteger(nextAfterSequence) ||
      nextAfterSequence < 1)
  ) {
    throw new Error('Run 事件历史游标无效');
  }
  return {
    items: input.items.map(parseAgentSseEvent),
    nextAfterSequence,
  };
}

function sortedUniqueEvents(events: readonly AgentRunEvent[]): AgentRunEvent[] {
  const byId = new Map<string, AgentRunEvent>();
  let sorted = true;
  let previousSequence = Number.NEGATIVE_INFINITY;

  events.forEach((event) => {
    if (event.sequence < previousSequence) sorted = false;
    previousSequence = event.sequence;
    const previous = byId.get(event.eventId);
    if (previous && previous.sequence !== event.sequence) sorted = false;
    byId.set(event.eventId, event);
  });

  const unique = [...byId.values()];
  return sorted ? unique : unique.sort((left, right) => left.sequence - right.sequence);
}

function mergeSortedEvents(
  current: readonly AgentRunEvent[],
  incoming: readonly AgentRunEvent[]
): AgentRunEvent[] {
  if (incoming.length === 0) return [...current];
  if (current.length === 0) return sortedUniqueEvents(incoming);

  const next = sortedUniqueEvents(incoming);
  const nextById = new Map(next.map((event) => [event.eventId, event]));
  const base = sortedUniqueEvents(current).filter((event) => {
    const overlapping = nextById.get(event.eventId);
    if (!overlapping) return true;
    if (
      event.type === 'model.reasoning.delta' &&
      overlapping.type === 'model.activity'
    ) {
      nextById.set(event.eventId, event);
    }
    return false;
  });
  const preferredNext = [...nextById.values()];
  const merged: AgentRunEvent[] = [];
  let baseIndex = 0;
  let nextIndex = 0;

  while (baseIndex < base.length || nextIndex < preferredNext.length) {
    const baseEvent = base[baseIndex];
    const nextEvent = preferredNext[nextIndex];
    if (nextEvent === undefined || (baseEvent !== undefined && baseEvent.sequence <= nextEvent.sequence)) {
      if (baseEvent !== undefined) merged.push(baseEvent);
      baseIndex += 1;
    } else {
      merged.push(nextEvent);
      nextIndex += 1;
    }
  }
  return merged;
}

function appendEventPage(
  ordered: AgentRunEvent[],
  byId: Map<string, AgentRunEvent>,
  pageItems: readonly AgentRunEvent[]
): AgentRunEvent[] {
  const additions = sortedUniqueEvents(pageItems).filter((event) => {
    if (byId.has(event.eventId)) return false;
    byId.set(event.eventId, event);
    return true;
  });
  if (additions.length === 0) return ordered;

  const lastSequence = ordered.at(-1)?.sequence ?? Number.NEGATIVE_INFINITY;
  if ((additions[0]?.sequence ?? lastSequence) >= lastSequence) {
    ordered.push(...additions);
    return ordered;
  }
  return mergeSortedEvents(ordered, additions);
}

export function useAgentRunEvents(
  runId: string | null | undefined,
  statusVersion: number | null | undefined,
  enabled: boolean,
  liveEvents: AgentThinkingEvent[] = []
) {
  const [state, setState] = useState<RunEventState>(EMPTY_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cachedRunIdRef = useRef<string | null>(null);
  const completedRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!runId) {
      cachedRunIdRef.current = null;
      completedRequestKeyRef.current = null;
      setState(EMPTY_STATE);
      return undefined;
    }
    if (!enabled) {
      setState((current) => (current.loading ? { ...current, loading: false } : current));
      return undefined;
    }

    const requestKey = `${runId}:${statusVersion ?? 'unknown'}`;
    if (completedRequestKeyRef.current === requestKey) return undefined;

    const controller = new AbortController();
    const sameRun = cachedRunIdRef.current === runId;
    cachedRunIdRef.current = runId;
    setState((current) =>
      sameRun
        ? { ...current, loaded: false, loading: true, error: null, partial: false }
        : { ...EMPTY_STATE, loading: true }
    );
    void (async () => {
      let collected = sameRun ? [...stateRef.current.items] : [];
      const collectedById = new Map(collected.map((event) => [event.eventId, event]));
      const seenCursors = new Set<number>();
      let afterSequence = 0;

      try {
        while (!controller.signal.aborted) {
          const page = eventPage(
            await agentApi.listRunEvents(
              {
                runId,
                afterSequence,
                limit: PAGE_SIZE,
                eventTypes: [...AGENT_THINKING_EVENT_TYPES],
              },
              controller.signal
            )
          );
          if (controller.signal.aborted) return;
          const previousLength = collected.length;
          collected = appendEventPage(collected, collectedById, page.items);
          if (page.nextAfterSequence === null) {
            completedRequestKeyRef.current = requestKey;
            setState({
              items: [...collected],
              nextAfterSequence: null,
              loaded: true,
              loading: false,
              error: null,
              partial: false,
            });
            return;
          }
          if (
            seenCursors.has(page.nextAfterSequence) ||
            page.nextAfterSequence <= afterSequence
          ) {
            completedRequestKeyRef.current = requestKey;
            setState({
              items: [...collected],
              nextAfterSequence: page.nextAfterSequence,
              loaded: true,
              loading: false,
              error: null,
              partial: true,
            });
            return;
          }
          if (collected.length !== previousLength) {
            setState({
              items: [...collected],
              nextAfterSequence: page.nextAfterSequence,
              loaded: false,
              loading: true,
              error: null,
              partial: false,
            });
          }
          seenCursors.add(page.nextAfterSequence);
          afterSequence = page.nextAfterSequence;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          items: [...collected],
          nextAfterSequence: afterSequence || null,
          loaded: true,
          loading: false,
          error: error instanceof Error ? error.message : 'Run 事件历史加载失败',
          partial: collected.length > 0,
        });
      }
    })();

    return () => controller.abort();
  }, [enabled, runId, statusVersion]);

  const items = useMemo(
    () => mergeSortedEvents(state.items, liveEvents),
    [liveEvents, state.items]
  );

  return { ...state, items };
}
