#!/usr/bin/env node
/**
 * scripts/generate-mocks.mjs
 *
 * Reads swagger.json and auto-generates src/mocks/mock-data.ts
 * containing realistic mock responses for all API endpoints.
 *
 * Usage:
 *   node scripts/generate-mocks.mjs                  # uses local swagger.json
 *   node scripts/generate-mocks.mjs --fetch           # fetches from localhost:3000/docs-json first
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SWAGGER_PATH = resolve(ROOT, 'swagger.json');
const OUTPUT_PATH = resolve(ROOT, 'src/mocks/mock-data.ts');

// ---------------------------------------------------------------------------
// 1. Optionally fetch latest swagger
// ---------------------------------------------------------------------------
async function maybeFetchSwagger() {
  if (process.argv.includes('--fetch')) {
    console.log('Fetching swagger from http://localhost:3000/docs-json ...');
    const resp = await fetch('http://localhost:3000/docs-json');
    if (!resp.ok) throw new Error(`Failed to fetch swagger: ${resp.status}`);
    const json = await resp.text();
    writeFileSync(SWAGGER_PATH, json, 'utf-8');
    console.log(`Saved swagger.json (${(json.length / 1024).toFixed(1)} KB)`);
  }
}

// ---------------------------------------------------------------------------
// 2. Parse & resolve swagger schemas
// ---------------------------------------------------------------------------
let swagger;

function resolveRef(ref) {
  const parts = ref.replace('#/', '').split('/');
  let current = swagger;
  for (const p of parts) current = current[p];
  return current;
}

/** Deep resolve all $ref in a schema, with cycle detection */
function resolveSchema(schema, visited = new Set()) {
  if (!schema) return schema;
  if (schema.$ref) {
    if (visited.has(schema.$ref)) return { type: 'object', _circular: true };
    visited.add(schema.$ref);
    return resolveSchema(resolveRef(schema.$ref), visited);
  }
  if (schema.allOf) {
    const merged = { type: 'object', properties: {}, required: [] };
    for (const sub of schema.allOf) {
      const resolved = resolveSchema(sub, new Set(visited));
      if (resolved.properties) Object.assign(merged.properties, resolved.properties);
      if (resolved.required) merged.required.push(...resolved.required);
    }
    return merged;
  }
  if (schema.oneOf) return resolveSchema(schema.oneOf[0], new Set(visited));
  if (schema.anyOf) return resolveSchema(schema.anyOf[0], new Set(visited));
  return schema;
}

// ---------------------------------------------------------------------------
// 3. Smart mock data generation based on property names / types / descriptions
// ---------------------------------------------------------------------------

// Realistic Chinese A-share stock data
const STOCKS = [
  { tsCode: '000001.SZ', name: '平安银行', industry: '银行' },
  { tsCode: '600519.SH', name: '贵州茅台', industry: '白酒' },
  { tsCode: '000858.SZ', name: '五粮液', industry: '白酒' },
  { tsCode: '601318.SH', name: '中国平安', industry: '保险' },
  { tsCode: '600036.SH', name: '招商银行', industry: '银行' },
  { tsCode: '000333.SZ', name: '美的集团', industry: '家电' },
  { tsCode: '002415.SZ', name: '海康威视', industry: '安防' },
  { tsCode: '600276.SH', name: '恒瑞医药', industry: '医药' },
  { tsCode: '000651.SZ', name: '格力电器', industry: '家电' },
  { tsCode: '601899.SH', name: '紫金矿业', industry: '有色金属' },
];

const INDUSTRIES = [
  '银行',
  '白酒',
  '保险',
  '家电',
  '安防',
  '医药',
  '有色金属',
  '新能源',
  '半导体',
  '汽车',
];
const INDEX_CODES = ['000001.SH', '399001.SZ', '399006.SZ', '000300.SH', '000016.SH'];
const INDEX_NAMES = ['上证指数', '深证成指', '创业板指', '沪深300', '上证50'];

let idCounter = 1;

function generateMockValue(propName, schema, parentName = '') {
  if (!schema) return null;

  const resolved = resolveSchema(schema);
  if (!resolved) return null;

  // Handle enum
  if (resolved.enum) return resolved.enum[0];

  // Handle example
  if (resolved.example !== undefined) return resolved.example;

  const type = resolved.type;
  const format = resolved.format;
  const desc = resolved.description || '';
  const name = propName.toLowerCase();

  // ── Strings ──
  if (type === 'string') {
    if (format === 'date-time') return '2024-12-15T10:30:00.000Z';
    if (format === 'date') return '2024-12-15';

    // Name-based heuristics
    if (name === 'tscode' || name === 'ts_code' || name === 'code' || name === 'stockcode')
      return STOCKS[0].tsCode;
    if (name === 'name' || name === 'stockname') return STOCKS[0].name;
    if (name === 'industry' || name === 'industryname' || name === 'groupname')
      return INDUSTRIES[0];
    if (name === 'indexcode') return INDEX_CODES[0];
    if (name === 'indexname') return INDEX_NAMES[0];
    if (name === 'tradedate' || name === 'trade_date' || name === 'date') return '20241215';
    if (name === 'startdate' || name === 'start_date') return '20240101';
    if (name === 'enddate' || name === 'end_date') return '20241215';
    if (name === 'period') return 'D';
    if (name === 'adjusttype') return 'qfq';
    if (name === 'account' || name === 'username') return 'demo';
    if (name === 'nickname') return 'Demo User';
    if (name === 'email') return 'demo@example.com';
    if (name === 'role') return 'ADMIN';
    if (name === 'status') return 'ACTIVE';
    if (name === 'accesstoken') return 'mock-jwt-token-for-demo';
    if (name === 'captchaid') return 'mock-captcha-id';
    if (name === 'svgimage')
      return '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text x="10" y="30" font-size="24" fill="#333">DEMO</text></svg>';
    if (name === 'id' || name.endsWith('id'))
      return `mock-${parentName || propName}-${idCounter++}`;
    if (name === 'description' || name === 'desc') return '这是一个演示数据的描述';
    if (name === 'title') return '演示标题';
    if (name === 'content') return '这是演示内容。';
    if (name === 'type' || name === 'category') return 'default';
    if (name === 'unit') return '元';
    if (name === 'color') return '#1890ff';
    if (name === 'label') return '标签';
    if (name === 'message') return '';
    if (name === 'reason' || name === 'remark') return '演示数据';
    if (name === 'strategytype' || name === 'strategy_type') return 'MA_CROSSOVER';
    if (name === 'direction') return 'BUY';
    if (name.includes('url') || name.includes('link')) return '#';

    return desc ? `Demo: ${desc.slice(0, 30)}` : `demo-${propName}`;
  }

  // ── Numbers ──
  if (type === 'number' || type === 'integer') {
    if (name === 'code') return 0; // ResponseModel.code
    if (name === 'id') return idCounter++;
    if (name === 'page' || name === 'currentpage') return 1;
    if (name === 'pagesize' || name === 'limit') return 20;
    if (name === 'total' || name === 'totalcount' || name === 'count') return 5;
    if (name === 'unreadcount') return 3;

    // Price-related
    if (name === 'close' || name === 'price' || name === 'pre_close' || name === 'preclose')
      return 35.68;
    if (name === 'open') return 35.2;
    if (name === 'high') return 36.15;
    if (name === 'low') return 34.85;
    if (name === 'pctchg' || name === 'pct_chg' || name === 'changepct' || name === 'change_pct')
      return 2.35;
    if (name === 'change') return 0.82;
    if (name === 'vol' || name === 'volume') return 1285643;
    if (name === 'amount') return 458926.5;
    if (name === 'totalmv' || name === 'totalmarketvalue') return 3580000;
    if (name === 'circmv' || name === 'circmarketvalue') return 2890000;
    if (name === 'turnoverrate' || name === 'turnover') return 1.25;
    if (name === 'pe' || name === 'peratio') return 12.5;
    if (name === 'pb' || name === 'pbratio') return 1.35;

    // Backtest metrics
    if (name === 'totalreturn' || name === 'annualizedreturn' || name === 'return') return 0.2536;
    if (name === 'sharperatio' || name === 'sharpe') return 1.85;
    if (name === 'maxdrawdown') return -0.1234;
    if (name === 'winrate') return 0.62;
    if (name === 'profitlossratio') return 2.15;
    if (name === 'totaltrades') return 156;
    if (name === 'initialcapital' || name === 'startcash') return 1000000;
    if (name === 'finalvalue' || name === 'endvalue') return 1253600;

    // Portfolio
    if (name === 'weight') return 0.15;
    if (name === 'quantity' || name === 'shares') return 1000;
    if (name === 'cost' || name === 'avgcost') return 32.5;
    if (name === 'pnl' || name === 'profit') return 3180;
    if (name === 'pnlpct' || name === 'returnrate') return 0.098;

    // Factor
    if (name === 'ic' || name === 'icmean') return 0.045;
    if (name === 'ir') return 0.85;
    if (name === 'icir') return 0.62;
    if (name === 'value' || name === 'score') return 0.75;
    if (name === 'corr' || name === 'correlation') return 0.32;

    // Alert/score
    if (name === 'backtestquota') return 100;
    if (name === 'watchlistlimit') return 20;

    // Generic numeric
    if (name.includes('ratio')) return 0.5;
    if (name.includes('rate')) return 0.05;
    if (name.includes('count') || name.includes('num')) return 10;
    return 42;
  }

  // ── Boolean ──
  if (type === 'boolean') {
    if (name === 'isalert' || name === 'iswarning') return false;
    if (name === 'isactive' || name === 'enabled' || name === 'success') return true;
    return true;
  }

  // ── Array ──
  if (type === 'array') {
    const itemSchema = resolved.items;
    if (!itemSchema) return [];
    const items = [];
    for (let i = 0; i < 3; i++) {
      items.push(generateMockObject(itemSchema, propName, i));
    }
    return items;
  }

  // ── Object ──
  if (type === 'object' || resolved.properties) {
    return generateMockObject(resolved, propName);
  }

  // ── null ──
  if (type === 'null' || resolved.nullable) return null;

  return null;
}

function generateMockObject(schema, parentName = '', index = 0) {
  const resolved = resolveSchema(schema);
  if (!resolved || resolved._circular) return {};

  if (!resolved.properties) {
    // Raw object without defined properties
    return {};
  }

  const result = {};
  const stockData = STOCKS[index % STOCKS.length];

  for (const [propName, propSchema] of Object.entries(resolved.properties)) {
    const resolvedProp = resolveSchema(propSchema);

    // Use stock-specific data for array items
    const name = propName.toLowerCase();
    if (name === 'tscode' || name === 'ts_code') {
      result[propName] = stockData.tsCode;
    } else if ((name === 'name' || name === 'stockname') && parentName) {
      result[propName] = stockData.name;
    } else if (name === 'industry' || name === 'industryname') {
      result[propName] = stockData.industry;
    } else {
      result[propName] = generateMockValue(propName, resolvedProp, parentName);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. Process all API endpoints
// ---------------------------------------------------------------------------
function generateAllMocks() {
  const mockMap = {};
  let count = 0;

  for (const [url, methods] of Object.entries(swagger.paths)) {
    if (!url.startsWith('/api/')) continue;

    const op = methods.post || methods.get;
    if (!op) continue;

    const resp = op.responses['200'] || op.responses['201'];
    if (!resp?.content) {
      // Endpoint with no response body → return generic success
      mockMap[url] = { code: 0, data: null, message: '' };
      count++;
      continue;
    }

    const schema = resp.content['application/json']?.schema;
    if (!schema) {
      mockMap[url] = { code: 0, data: null, message: '' };
      count++;
      continue;
    }

    // Reset counter per endpoint for more consistent IDs
    const savedCounter = idCounter;

    const resolved = resolveSchema(schema);
    if (resolved.properties) {
      const result = {};
      for (const [propName, propSchema] of Object.entries(resolved.properties)) {
        result[propName] = generateMockValue(propName, propSchema, url.split('/').pop());
      }
      mockMap[url] = result;
    } else {
      mockMap[url] = { code: 0, data: null, message: '' };
    }

    count++;
  }

  return { mockMap, count };
}

// ---------------------------------------------------------------------------
// 5. Output TypeScript file
// ---------------------------------------------------------------------------
function writeOutput(mockMap, count) {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  const content = `// Auto-generated by scripts/generate-mocks.mjs — DO NOT EDIT manually
// Generated from swagger.json on ${new Date().toISOString().split('T')[0]}
// ${count} endpoints mocked
//
// Regenerate: node scripts/generate-mocks.mjs [--fetch]

type MockDataMap = Record<string, unknown>;

const mockData: MockDataMap = ${JSON.stringify(mockMap, null, 2)};

export default mockData;
`;

  writeFileSync(OUTPUT_PATH, content, 'utf-8');
  console.log(
    `✅ Generated ${OUTPUT_PATH} (${count} endpoints, ${(content.length / 1024).toFixed(1)} KB)`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await maybeFetchSwagger();

  const raw = readFileSync(SWAGGER_PATH, 'utf-8');
  swagger = JSON.parse(raw);

  console.log(
    `Parsing swagger: ${Object.keys(swagger.paths).length} paths, ${Object.keys(swagger.components?.schemas || {}).length} schemas`
  );

  const { mockMap, count } = generateAllMocks();
  writeOutput(mockMap, count);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
