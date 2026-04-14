/** 登录凭据 — 从环境变量读取，fallback 到默认测试账号 */
export const TEST_ACCOUNT = {
  account: process.env.E2E_ACCOUNT ?? 'e2e-test',
  password: process.env.E2E_PASSWORD ?? 'e2e-test-pass',
  captchaCode: process.env.E2E_CAPTCHA_CODE ?? '1234',
};

/** 已知存在的股票（用于搜索测试） */
export const KNOWN_STOCK = {
  tsCode: '000001.SZ',
  name: '平安银行',
  keyword: '平安',
};

/** 回测模板 ID */
export const BACKTEST_TEMPLATE = {
  id: 'MA_CROSS_SINGLE',
  name: '均线交叉',
};

/** 选股器预设条件 */
export const SCREENER_DEFAULTS = {
  exchange: 'SSE',
  minPeTtm: 0,
  maxPeTtm: 50,
};
