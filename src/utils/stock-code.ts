// ----------------------------------------------------------------------
// 股票代码格式转换工具
// ----------------------------------------------------------------------

const EXCHANGE_PREFIX: Record<string, string> = {
  SH: 'sh',
  SZ: 'sz',
  BJ: 'bj',
};

/**
 * 将 Tushare 格式代码转换为 stock-sdk 所需格式。
 * 例如：`300364.SZ` → `sz300364`，`600519.SH` → `sh600519`，`830799.BJ` → `bj830799`。
 * 无法识别时返回 `null`。
 */
export function toSdkCode(tsCode: string | null | undefined): string | null {
  if (!tsCode) return null;
  const [code, suffix] = tsCode.split('.');
  if (!code || !suffix) return null;
  const prefix = EXCHANGE_PREFIX[suffix.toUpperCase()];
  if (!prefix) return null;
  if (!/^\d+$/.test(code)) return null;
  return `${prefix}${code}`;
}
