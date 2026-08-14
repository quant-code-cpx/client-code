export function getAShareReturnColor<TNeutral extends string>(
  value: number | null | undefined,
  neutral: TNeutral
): 'error' | 'success' | TNeutral {
  if (value == null || !Number.isFinite(value) || value === 0) return neutral;
  return value > 0 ? 'error' : 'success';
}

export function getAShareReturnTextColor(
  value: number | null | undefined
): 'error.main' | 'success.main' | 'text.secondary' {
  const color = getAShareReturnColor(value, 'text.secondary');
  if (color === 'error') return 'error.main';
  if (color === 'success') return 'success.main';
  return color;
}
