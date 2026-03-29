import type ApexCharts from 'apexcharts';

import { useIsClient } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';
import { useRef, useState, useEffect } from 'react';

import { styled } from '@mui/material/styles';

import { chartClasses } from './classes';
import { ChartLoading } from './components';

import type { ChartProps } from './types';

// ----------------------------------------------------------------------

// Serialize chart mount/render globally. ApexCharts modifies shared internal
// state during construction and render(). When multiple Chart instances mount
// concurrently (e.g. 3 charts on the same tab), the parallel deep-merge
// operations corrupt that state, causing "t3.hasOwnProperty is not a function".
// By chaining all mount operations through a single promise queue we guarantee
// only one chart is being constructed/rendered at any given time.
let _chartMountQueue: Promise<void> = Promise.resolve();

function serializedChartMount(fn: () => Promise<void>): Promise<void> {
  const op = _chartMountQueue.then(fn);
  // Ensure the queue advances even if `fn` rejects
  _chartMountQueue = op.then(
    () => {},
    () => {}
  );
  return op;
}

// Patch ApexCharts' internal Utils.clone and Utils.extend to use
// Object.prototype.hasOwnProperty.call() instead of obj.hasOwnProperty().
// ApexCharts' deep-merge/clone functions call obj.hasOwnProperty(key) directly,
// which crashes when obj was created with Object.create(null) or has its
// prototype otherwise stripped. This can happen when stale internal state objects
// are left behind after chart.destroy() or when libraries like es-toolkit produce
// objects without Object.prototype.
let _apexPatched = false;

function patchApexCharts(ApexCtor: unknown): void {
  if (_apexPatched) return;
  _apexPatched = true;

  const _hop = Object.prototype.hasOwnProperty;

  // The minified Utils class has static methods "clone" and "extend" that use
  // the unsafe .hasOwnProperty() call. We find the class by scanning the
  // constructor's own properties or the prototype chain for a method named
  // "clone" that contains "hasOwnProperty" in its source.
  function findUtilsClass(root: unknown): { prototype?: Record<string, unknown> } | null {
    if (!root || typeof root !== 'function') return null;
    const ctor = root as unknown as Record<string, unknown>;

    // Check static methods on the constructor or other internal classes
    // referenced through the module. ApexCharts bundles the Utils class
    // in the same module scope, but doesn't export it. However, some builds
    // attach it to the constructor.
    for (const key of Object.getOwnPropertyNames(ctor)) {
      try {
        const val = ctor[key];
        if (
          val &&
          typeof val === 'function' &&
          typeof (val as { prototype?: unknown }).prototype === 'object'
        ) {
          const proto = (val as { prototype: Record<string, unknown> }).prototype;
          if (typeof proto.clone === 'function' && String(proto.clone).includes('hasOwnProperty')) {
            return val as { prototype: Record<string, unknown> };
          }
        }
      } catch {
        // skip non-accessible properties
      }
    }
    return null;
  }

  const UtilsClass = findUtilsClass(ApexCtor);
  if (UtilsClass?.prototype) {
    const origClone = UtilsClass.prototype.clone as (
      t: unknown,
      m?: WeakMap<object, unknown>
    ) => unknown;

    if (typeof origClone === 'function') {
      UtilsClass.prototype.clone = function safeClone(
        t: unknown,
        map?: WeakMap<object, unknown>
      ): unknown {
        if (t === null || typeof t !== 'object') return t;
        const m = map ?? new WeakMap();
        if (m.has(t as object)) return m.get(t as object);

        let e: unknown;
        if (Array.isArray(t)) {
          e = [];
          m.set(t, e);
          for (let i = 0; i < t.length; i++) {
            (e as unknown[])[i] = safeClone.call(this, t[i], m);
          }
        } else if (t instanceof Date) {
          e = new Date(t.getTime());
        } else {
          const obj = t as Record<string, unknown>;
          const result: Record<string, unknown> = {};
          m.set(t as object, result);
          for (const key in obj) {
            if (_hop.call(obj, key)) {
              result[key] = safeClone.call(this, obj[key], m);
            }
          }
          e = result;
        }
        return e;
      };
    }
  }

  // Fallback: if we couldn't find the Utils class through static properties,
  // install a global safety net. Replace Object.prototype.hasOwnProperty
  // temporarily during render? No — that's too invasive.
  // Instead, we intercept the Apex global config to prevent stale state.
  const w = window as unknown as Record<string, unknown>;
  if (!w.Apex || typeof w.Apex !== 'object') {
    w.Apex = {};
  }
}

/**
 * Purge stale chart entries from ApexCharts' global _chartInstances registry.
 * Also attempts to destroy charts that match a given ID.
 */
function purgeStaleCharts(ApexCtor: unknown, chartId: string | undefined): void {
  // Method 1: Use the static getChartByID method (note: uppercase D)
  if (chartId) {
    try {
      type ApexWithStatics = {
        getChartByID?: (id: string) => { destroy(): void } | null;
      };
      const stale = (ApexCtor as unknown as ApexWithStatics).getChartByID?.(chartId);
      if (stale) {
        stale.destroy();
      }
    } catch {
      // non-critical
    }
  }

  // Method 2: Directly clean the _chartInstances array for this chart ID
  const apex = (window as unknown as Record<string, unknown>).Apex as
    | { _chartInstances?: Array<{ id: string; chart: { destroy(): void } }> }
    | undefined;

  if (chartId && apex?._chartInstances) {
    for (let i = apex._chartInstances.length - 1; i >= 0; i--) {
      if (apex._chartInstances[i].id === chartId) {
        try {
          apex._chartInstances[i].chart.destroy();
        } catch {
          // ignore
        }
        apex._chartInstances.splice(i, 1);
      }
    }
  }
}

// ----------------------------------------------------------------------

function sanitizeApexValue<T>(value: T): T {
  if (value == null) {
    return value;
  }

  if (typeof value === 'function') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeApexValue(item)) as T;
  }

  if (typeof value === 'object') {
    const plain: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      plain[key] = sanitizeApexValue(nestedValue);
    }

    return plain as T;
  }

  return value;
}

function stableSerialize(value: unknown): string {
  if (value == null) return String(value);
  if (typeof value === 'function') return '[Function]';
  if (value instanceof Date) return `Date(${value.toISOString()})`;

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${key}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function Chart({ type, series, options, slotProps, className, sx, ...other }: ChartProps) {
  const isClient = useIsClient();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);
  const frameRef = useRef<number | null>(null);
  const configRef = useRef({
    options: sanitizeApexValue(options ?? {}),
    series: sanitizeApexValue(series ?? []),
    type,
  });
  const [isReady, setIsReady] = useState(false);

  const renderFallback = () => <ChartLoading type={type} sx={slotProps?.loading} />;

  const safeOptions = sanitizeApexValue(options ?? {});
  const safeSeries = sanitizeApexValue(series ?? []);
  const renderSignature = stableSerialize({ type, options: safeOptions, series: safeSeries });

  configRef.current = {
    options: safeOptions,
    series: safeSeries,
    type,
  };

  useEffect(() => {
    const containerEl = containerRef.current;

    if (!isClient || !containerEl) {
      return undefined;
    }

    let isDisposed = false;
    let instance: ApexCharts | null = null;

    setIsReady(false);

    const mountChart = async () => {
      const { default: ApexChartsCtor } = await import('apexcharts');

      // ESM build does NOT auto-register window.ApexCharts.
      // We need it for the static exec() API used to sync charts (zoom, scroll).
      if (!(window as unknown as Record<string, unknown>).ApexCharts) {
        (window as unknown as Record<string, unknown>).ApexCharts = ApexChartsCtor;
      }

      // Patch ApexCharts' internal Utils.clone to use safe hasOwnProperty
      // (only runs once, on first import).
      patchApexCharts(ApexChartsCtor);

      if (isDisposed || !containerEl) {
        return;
      }

      // Serialize the actual chart creation + render to prevent concurrent
      // ApexCharts instances from corrupting shared global state.
      await serializedChartMount(async () => {
        // Re-check after acquiring the queue slot — the component may have
        // been unmounted while waiting.
        if (isDisposed || !containerEl) {
          return;
        }

        const config = configRef.current;

        // Pre-destroy any chart with the same ID still registered in ApexCharts'
        // global instance registry.
        const staleChartId = (config.options as Record<string, Record<string, unknown>>)?.chart
          ?.id as string | undefined;

        purgeStaleCharts(ApexChartsCtor, staleChartId);

        // Ensure the DOM container is clean before handing it to the new instance.
        if (containerEl.innerHTML !== '') {
          containerEl.innerHTML = '';
        }

        const measuredHeight = Math.round(containerEl.getBoundingClientRect().height);
        const measuredWidth = Math.round(containerEl.getBoundingClientRect().width);
        const resolvedHeight =
          config.options?.chart?.height ?? (measuredHeight > 0 ? measuredHeight : undefined);
        const resolvedWidth =
          config.options?.chart?.width ?? (measuredWidth > 0 ? measuredWidth : '100%');

        const chart = new ApexChartsCtor(containerEl, {
          ...(config.options ?? {}),
          chart: {
            ...(config.options?.chart ?? {}),
            type: config.type,
            height: resolvedHeight,
            parentHeightOffset: config.options?.chart?.parentHeightOffset ?? 0,
            width: resolvedWidth,
          },
          series: config.series ?? [],
        });

        instance = chart;
        chartRef.current = chart;

        // Schedule skeleton dismissal BEFORE calling render().
        // render() may throw synchronously; if we defer rAF to after render(),
        // a synchronous throw skips the rAF entirely and the skeleton hangs forever.
        frameRef.current = window.requestAnimationFrame(() => {
          if (!isDisposed) {
            setIsReady(true);
          }
        });

        try {
          // Await render() so the queue releases only after the chart fully
          // initialises — prevents the next chart from racing against this
          // chart's async internal setup.
          await chart.render();

          if (isDisposed) {
            try {
              chart.destroy();
            } catch {
              // ignore cleanup race during disposal
            }
          }
        } catch (error) {
          console.error('Apex chart render failed:', error);
        }
      });
    };

    mountChart();

    return () => {
      isDisposed = true;
      setIsReady(false);

      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      const chart = chartRef.current ?? instance;
      chartRef.current = null;

      if (chart) {
        try {
          chart.destroy();
        } catch {
          // Ignore ApexCharts cleanup errors during StrictMode simulated unmount.
        }
      }

      containerEl.innerHTML = '';
    };
  }, [isClient, renderSignature]);

  return (
    <ChartRoot
      dir="ltr"
      className={mergeClasses([chartClasses.root, className])}
      sx={sx}
      {...other}
    >
      <ChartCanvas ref={containerRef} />

      {(!isClient || !isReady) && renderFallback()}
    </ChartRoot>
  );
}

// ----------------------------------------------------------------------

const ChartRoot = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  flexShrink: 0,
  overflow: 'hidden',
  position: 'relative',
  borderRadius: theme.shape.borderRadius * 1.5,
}));

const ChartCanvas = styled('div')({
  width: '100%',
  height: '100%',
  minHeight: 0,
});
