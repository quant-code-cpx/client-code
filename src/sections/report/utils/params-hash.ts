// ─── Stable hash for params object ─────────────────────────────────────────
//
// Series grouping needs a deterministic short hash so two reports that were
// generated from logically equivalent params land in the same group, even
// when the backend hasn't yet returned `paramsHash`.
//
// Implementation: canonicalise (sort object keys recursively, drop
// `null`/`undefined`/empty-string values), then run a light-weight FNV-1a
// 32-bit hash. Result is a 8-char base36 string.

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => canonicalise(v));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        const v = obj[k];
        if (v === null || v === undefined || v === '') return;
        out[k] = canonicalise(v);
      });
    return out;
  }
  return value;
}

function fnv1a32(str: string): number {
  /* eslint-disable no-bitwise */
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
  /* eslint-enable no-bitwise */
}

export function paramsHash(params: Record<string, unknown> | null | undefined): string {
  if (!params) return '0';
  const json = JSON.stringify(canonicalise(params));
  return fnv1a32(json).toString(36).padStart(8, '0');
}
