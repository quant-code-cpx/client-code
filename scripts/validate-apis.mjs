#!/usr/bin/env node
/**
 * scripts/validate-apis.mjs
 *
 * 自动联调校验：
 *  1. 提取前端 src/api/ 下所有 apiClient.post 调用
 *  2. 与 swagger.json 中 POST 端点比对 URL
 *  3. 对有 requestBody schema 的端点，比对前端 TS 类型字段名
 *  4. 输出详细报告，并可选择自动修复已知的简单 URL 错误
 *
 * 用法：
 *   node scripts/validate-apis.mjs           # 只校验，输出报告
 *   node scripts/validate-apis.mjs --fix     # 校验 + 自动修复 URL 路径错误
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const API_DIR = resolve(ROOT, 'src/api');
const SWAGGER_PATH = resolve(ROOT, 'swagger.json');

const FIX_MODE = process.argv.includes('--fix');

// ────────────────────────────────────────────────────────────────
// 颜色工具
// ────────────────────────────────────────────────────────────────
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;
const D = (s) => `\x1b[90m${s}\x1b[0m`;

// ────────────────────────────────────────────────────────────────
// 1. 解析 swagger.json
// ────────────────────────────────────────────────────────────────
const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf8'));
const schemas = swagger.components?.schemas ?? {};

/** 解析 $ref 引用，返回 schema 对象 */
function resolveRef(ref) {
  if (!ref) return null;
  const name = ref.replace('#/components/schemas/', '');
  return schemas[name] ?? null;
}

/** 解析 schema 的所有字段：{ fieldName: { required, type, enum } } */
function schemaFields(schema) {
  if (!schema) return {};
  // 处理 allOf
  if (schema.allOf) {
    return schema.allOf.reduce(
      (acc, s) => Object.assign(acc, schemaFields(resolveRef(s.$ref) ?? s)),
      {}
    );
  }
  const required = new Set(schema.required ?? []);
  const props = schema.properties ?? {};
  const result = {};
  for (const [name, def] of Object.entries(props)) {
    result[name] = {
      required: required.has(name),
      type: def.type ?? (def.$ref ? 'object' : 'any'),
      enum: def.enum ?? null,
      description: def.description ?? null,
    };
  }
  return result;
}

// 构建 swagger POST 端点映射: path -> { operationId, requestFields, responseDescription }
const swaggerEndpoints = new Map();
for (const [path, methods] of Object.entries(swagger.paths ?? {})) {
  const op = methods.post;
  if (!op) continue;
  const body = op.requestBody?.content?.['application/json']?.schema;
  let reqFields = {};
  if (body) {
    const resolved = body.$ref ? resolveRef(body.$ref) : body;
    reqFields = schemaFields(resolved);
  }
  swaggerEndpoints.set(path, {
    operationId: op.operationId ?? '',
    summary: op.summary ?? '',
    reqFields,
    hasSchema: Object.keys(reqFields).length > 0,
  });
}

// ────────────────────────────────────────────────────────────────
// 2. 解析前端 API 文件
// ────────────────────────────────────────────────────────────────

/** 从 TS 源码中提取所有 apiClient.post 调用的 URL */
function extractApiCalls(src) {
  const calls = [];
  // 匹配 apiClient.post<...>('/api/...', ...) 或 apiClient.post('/api/...', ...)
  const re = /apiClient\.post(?:<[^>]*>)?\(\s*['"`](\/api\/[^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    calls.push(m[1]);
  }
  return calls;
}

/** 从 TS 源码中提取所有 type/interface 定义及其字段 */
function extractTypeFields(src) {
  const types = {};

  // type Foo = { field1: T; field2?: T; ... }
  const typeRe = /export\s+type\s+(\w+)\s*=\s*\{([^}]+)\}/gs;
  let m;
  while ((m = typeRe.exec(src)) !== null) {
    const name = m[1];
    const body = m[2];
    const fields = {};
    const fieldRe = /^\s*(\/\/[^\n]*)?\s*(\w+)\??:\s*([^;,\n]+)/gm;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      if (fm[1]) continue; // skip comment-only lines
      const fname = fm[2];
      const ftype = fm[3].trim();
      const required = !body.match(new RegExp(`\\b${fname}\\?:`));
      fields[fname] = { required, type: ftype };
    }
    types[name] = fields;
  }

  // interface Foo { ... }
  const ifaceRe = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+\S+\s*)?\{([^}]+)\}/gs;
  while ((m = ifaceRe.exec(src)) !== null) {
    const name = m[1];
    const body = m[2];
    const fields = {};
    const fieldRe = /^\s*(\/\/[^\n]*)?\s*(\w+)\??:\s*([^;,\n]+)/gm;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      if (fm[1]) continue;
      const fname = fm[2];
      const ftype = fm[3].trim();
      const required = !body.match(new RegExp(`\\b${fname}\\?:`));
      fields[fname] = { required, type: ftype };
    }
    types[name] = fields;
  }

  return types;
}

/** 找到调用某 URL 的函数体，提取传入的参数类型名 */
function findParamType(src, url) {
  // 寻找包含该 URL 的 function 定义，提取参数类型
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 向上找函数签名
  const idx = src.indexOf(`'${url}'`);
  if (idx === -1) return null;
  const before = src.slice(Math.max(0, idx - 600), idx);
  // 匹配 function xxx(param: TypeName) 或 (param: TypeName) =>
  const m = before.match(/(?:function\s+\w+|const\s+\w+\s*=)\s*\(([^)]*)\)/);
  if (!m) return null;
  const params = m[1];
  // e.g. "query: ResearchNoteQuery" -> "ResearchNoteQuery"
  const tm = params.match(/:\s*([A-Z]\w+)/);
  return tm ? tm[1] : null;
}

// ────────────────────────────────────────────────────────────────
// 3. 扫描所有 API 文件
// ────────────────────────────────────────────────────────────────
const files = readdirSync(API_DIR).filter(
  (f) => f.endsWith('.ts') && !f.startsWith('__') && f !== 'client.ts' && f !== 'index.ts'
);

const allFrontendCalls = new Map(); // url -> { file, paramTypeName, typeFields }
const fileContents = {};

for (const file of files) {
  const filePath = resolve(API_DIR, file);
  const src = readFileSync(filePath, 'utf8');
  fileContents[file] = src;

  const urls = extractApiCalls(src);
  const types = extractTypeFields(src);

  for (const url of urls) {
    const paramType = findParamType(src, url);
    const typeFields = paramType && types[paramType] ? types[paramType] : null;
    if (!allFrontendCalls.has(url)) {
      allFrontendCalls.set(url, { file, paramType, typeFields });
    }
  }
}

// ────────────────────────────────────────────────────────────────
// 4. 比对结果
// ────────────────────────────────────────────────────────────────

const missingFromSwagger = []; // 前端有，swagger 没有
const missingFromFrontend = []; // swagger 有，前端没有
const matched = []; // 两边都有，可做字段比对
const fieldMismatches = []; // 字段比对不一致

for (const [url, info] of allFrontendCalls) {
  if (swaggerEndpoints.has(url)) {
    matched.push({ url, frontendInfo: info, swaggerInfo: swaggerEndpoints.get(url) });
  } else {
    missingFromSwagger.push({ url, ...info });
  }
}

for (const [path, info] of swaggerEndpoints) {
  if (!allFrontendCalls.has(path)) {
    // 跳过非业务端点
    if (path.startsWith('/api/')) {
      missingFromFrontend.push({ url: path, ...info });
    }
  }
}

// 字段比对（只对有 swagger schema 且前端有类型的情况）
for (const { url, frontendInfo, swaggerInfo } of matched) {
  if (!swaggerInfo.hasSchema) continue;
  if (!frontendInfo.typeFields) continue;

  const swFields = new Set(Object.keys(swaggerInfo.reqFields));
  const feFields = new Set(Object.keys(frontendInfo.typeFields));

  const onlyInSwagger = [...swFields].filter((f) => !feFields.has(f));
  const onlyInFrontend = [...feFields].filter((f) => !swFields.has(f));

  // 枚举值比对
  const enumMismatches = [];
  for (const [fname, swDef] of Object.entries(swaggerInfo.reqFields)) {
    if (!swDef.enum || !feFields.has(fname)) continue;
    const feType = frontendInfo.typeFields[fname]?.type ?? '';
    // 提取前端枚举值
    const feEnums = feType.match(/'([^']+)'/g)?.map((s) => s.replace(/'/g, '')) ?? [];
    const swEnums = swDef.enum;
    const missing = swEnums.filter((v) => !feEnums.includes(v));
    const extra = feEnums.filter((v) => !swEnums.includes(v));
    if (missing.length || extra.length) {
      enumMismatches.push({ field: fname, swEnums, feEnums, missing, extra });
    }
  }

  if (onlyInSwagger.length || onlyInFrontend.length || enumMismatches.length) {
    fieldMismatches.push({
      url,
      file: frontendInfo.file,
      typeName: frontendInfo.paramType,
      onlyInSwagger,
      onlyInFrontend,
      enumMismatches,
    });
  }
}

// ────────────────────────────────────────────────────────────────
// 5. 输出报告
// ────────────────────────────────────────────────────────────────

console.log('\n' + B('═'.repeat(70)));
console.log(B('  前端 API 联调校验报告'));
console.log(B('═'.repeat(70)));
console.log(`
  前端调用接口数:   ${allFrontendCalls.size}
  swagger POST端点: ${swaggerEndpoints.size}
  URL 完全匹配:     ${G(matched.length)}
  仅前端有（可能错误）: ${R(missingFromSwagger.length)}
  仅 swagger 有:    ${Y(missingFromFrontend.length)}
  字段级不一致:     ${fieldMismatches.length > 0 ? Y(fieldMismatches.length) : G(0)}
`);

// ── 5a. 前端有但 swagger 没有 ──
if (missingFromSwagger.length) {
  console.log(R('【❌ 前端调用了但 swagger 中不存在的接口】'));
  for (const { url, file } of missingFromSwagger) {
    // 尝试在 swagger 中找相近路径
    const base = url.split('/').pop();
    const similar = [...swaggerEndpoints.keys()].filter(
      (p) => p.includes(base) || base.includes(p.split('/').pop())
    );
    console.log(`  ${R('✗')} ${url}`);
    console.log(`      文件: src/api/${file}`);
    if (similar.length) {
      console.log(`      ${Y('相近路径:')} ${similar.join(', ')}`);
    }
  }
  console.log();
}

// ── 5b. swagger 有但前端没有 ──
if (missingFromFrontend.length) {
  console.log(Y('【⚠️  swagger 中有但前端未调用的接口】'));
  for (const { url, operationId, summary } of missingFromFrontend) {
    console.log(`  ${Y('?')} ${url}  ${D(`(${operationId}) ${summary}`)}`);
  }
  console.log();
}

// ── 5c. 字段级比对 ──
if (fieldMismatches.length) {
  console.log(Y('【⚠️  请求字段不一致（swagger vs 前端类型）】'));
  for (const {
    url,
    file,
    typeName,
    onlyInSwagger,
    onlyInFrontend,
    enumMismatches,
  } of fieldMismatches) {
    console.log(`  ${B(url)}  ${D(`${file} → ${typeName}`)}`);
    if (onlyInSwagger.length) {
      console.log(`    ${Y('swagger 有，前端缺少:')} ${onlyInSwagger.join(', ')}`);
    }
    if (onlyInFrontend.length) {
      console.log(`    ${D('前端多出（swagger 无定义）:')} ${onlyInFrontend.join(', ')}`);
    }
    for (const { field, swEnums, feEnums, missing, extra } of enumMismatches) {
      console.log(`    ${Y('枚举不一致')} [${field}]:`);
      if (missing.length) console.log(`      swagger 有但前端缺: ${missing.join(', ')}`);
      if (extra.length) console.log(`      前端多出: ${extra.join(', ')}`);
    }
  }
  console.log();
}

// ── 5d. 匹配成功 ──
console.log(G('【✅ URL 匹配的接口】'));
for (const { url, frontendInfo, swaggerInfo } of matched) {
  const schemaOk =
    !swaggerInfo.hasSchema ||
    !frontendInfo.typeFields ||
    !fieldMismatches.find((m) => m.url === url);
  const mark = schemaOk ? G('✓') : Y('~');
  console.log(`  ${mark} ${url}  ${D(frontendInfo.file)}`);
}
console.log();

// ────────────────────────────────────────────────────────────────
// 6. 自动修复模式
// ────────────────────────────────────────────────────────────────
if (FIX_MODE) {
  console.log(B('【🔧 自动修复模式】'));

  // 已知的 URL 修复规则（根据设计文档和 swagger 对比）
  const urlFixes = [
    {
      file: 'research-note.ts',
      from: '/api/research-note/by-stock',
      to: '/api/research-note/stock',
      reason: 'swagger operationId=findByStock, 路径为 /research-note/stock',
    },
  ];

  // 已知的需要移除/存档的接口（swagger 中不存在，且没有相近路径）
  const deadEndpoints = [
    {
      file: 'backtest.ts',
      url: '/api/backtests/runs/rebalance-logs',
      reason: 'swagger 中无此端点，后端已移除',
    },
    {
      file: 'stock.ts',
      url: '/api/stock/detail/dividend-financing',
      reason: 'swagger 中无此端点，最接近的是 /stock/detail/financing',
    },
  ];

  // 执行 URL 修复
  const { writeFileSync } = await import('fs');

  for (const fix of urlFixes) {
    const filePath = resolve(API_DIR, fix.file);
    const src = readFileSync(filePath, 'utf8');
    if (src.includes(fix.from)) {
      const updated = src.replaceAll(fix.from, fix.to);
      writeFileSync(filePath, updated, 'utf8');
      console.log(`  ${G('✓ 已修复')} ${fix.file}: ${R(fix.from)} → ${G(fix.to)}`);
      console.log(`    原因: ${fix.reason}`);
    } else {
      console.log(`  ${D('- 跳过')} ${fix.file}: 未找到 ${fix.from}（可能已修复）`);
    }
  }

  // 标记不存在的接口（不自动删除，只输出警告让开发者决定）
  console.log();
  console.log(Y('以下接口在 swagger 中不存在，需人工确认是否移除：'));
  for (const { file, url, reason } of deadEndpoints) {
    const src = fileContents[file] ?? '';
    if (src.includes(`'${url}'`)) {
      console.log(`  ${Y('!')} src/api/${file}: ${url}`);
      console.log(`    ${reason}`);
    } else {
      console.log(`  ${D('-')} src/api/${file}: ${url} ${D('(已不存在)')}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// 7. 汇总
// ────────────────────────────────────────────────────────────────
console.log(B('═'.repeat(70)));
const errCount = missingFromSwagger.length;
const warnCount = missingFromFrontend.length + fieldMismatches.length;
if (errCount === 0 && warnCount === 0) {
  console.log(G('  ✅ 所有接口校验通过！'));
} else {
  if (errCount > 0) console.log(R(`  ❌ ${errCount} 个 URL 错误（前端调用了不存在的接口）`));
  if (fieldMismatches.length > 0) console.log(Y(`  ⚠️  ${fieldMismatches.length} 个字段级不一致`));
  if (missingFromFrontend.length > 0)
    console.log(Y(`  ℹ️  ${missingFromFrontend.length} 个 swagger 端点未被前端使用`));
  if (!FIX_MODE && errCount > 0) {
    console.log(
      D('\n  提示：运行 node scripts/validate-apis.mjs --fix 可自动修复已知的 URL 路径错误')
    );
  }
}
console.log(B('═'.repeat(70)));
console.log();

process.exit(errCount > 0 ? 1 : 0);
