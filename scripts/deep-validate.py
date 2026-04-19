#!/usr/bin/env python3
"""
deep-validate.py  —— 前端 ↔ Swagger 深度联调校验
=================================================
对比 swagger.json 中每个 POST 端点的 requestBody / response schema
与 src/api/*.ts 中前端定义的请求参数 / 返回类型，找出字段级不一致。

用法:
    python3 scripts/deep-validate.py          # 只输出报告
    python3 scripts/deep-validate.py --json   # JSON 格式

检查维度:
  1. 请求参数字段: 前端多了 / 少了 / 命名风格不一致(camelCase vs snake_case)
  2. 响应数据字段: 前端类型与后端 DTO 字段对比
  3. URL 存在性: 前端调了 swagger 没有的路径 / swagger 有但前端没调的路径
"""

import json
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
SWAGGER = ROOT / "swagger.json"
API_DIR = ROOT / "src" / "api"

# ─── 1. 解析 swagger.json ─────────────────────────────────────────────

with open(SWAGGER) as f:
    spec = json.load(f)

schemas = spec.get("components", {}).get("schemas", {})


def resolve_ref(ref_str):
    """#/components/schemas/Xxx -> 'Xxx'"""
    if isinstance(ref_str, str) and ref_str.startswith("#/components/schemas/"):
        return ref_str.split("/")[-1]
    return None


def get_schema_fields(schema_name, depth=0, visited=None):
    """
    递归解析一个 schema 的所有顶层字段名和类型。
    返回 dict: { field_name: { type, required, description, nested_fields } }
    """
    if visited is None:
        visited = set()
    if schema_name in visited or depth > 5:
        return {}
    visited.add(schema_name)

    sc = schemas.get(schema_name, {})
    result = {}

    # 直接 properties
    required_set = set(sc.get("required", []))
    for fname, fdef in sc.get("properties", {}).items():
        ftype = fdef.get("type", "unknown")
        ref = fdef.get("$ref")
        items_ref = fdef.get("items", {}).get("$ref") if "items" in fdef else None

        nested = None
        if ref:
            ref_name = resolve_ref(ref)
            if ref_name:
                ftype = ref_name
                nested = get_schema_fields(ref_name, depth + 1, visited.copy())
        elif items_ref:
            ref_name = resolve_ref(items_ref)
            if ref_name:
                ftype = f"{ref_name}[]"
                nested = get_schema_fields(ref_name, depth + 1, visited.copy())

        result[fname] = {
            "type": ftype,
            "required": fname in required_set,
            "enum": fdef.get("enum"),
            "nested": nested,
        }

    # allOf 合并
    for item in sc.get("allOf", []):
        ref = item.get("$ref")
        if ref:
            ref_name = resolve_ref(ref)
            if ref_name:
                result.update(get_schema_fields(ref_name, depth + 1, visited.copy()))
        for fname, fdef in item.get("properties", {}).items():
            ftype = fdef.get("type", "unknown")
            result[fname] = {"type": ftype, "required": False, "enum": fdef.get("enum"), "nested": None}

    return result


def get_endpoint_info(path, method_obj):
    """从 swagger 端点定义中提取请求和响应字段信息"""
    info = {"req_dto": None, "req_fields": {}, "resp_dto": None, "resp_fields": {}, "resp_is_array": False}

    # Request body
    rb = method_obj.get("requestBody", {})
    if rb:
        sc = rb.get("content", {}).get("application/json", {}).get("schema", {})
        ref = sc.get("$ref")
        if ref:
            dto_name = resolve_ref(ref)
            if dto_name:
                info["req_dto"] = dto_name
                info["req_fields"] = get_schema_fields(dto_name)

    # Response
    for code in ["200", "201"]:
        r = method_obj.get("responses", {}).get(code, {})
        rs = r.get("content", {}).get("application/json", {}).get("schema", {})
        if not rs:
            continue
        # allOf with ResponseModel
        for item in rs.get("allOf", []):
            props = item.get("properties", {})
            if "data" in props:
                data_schema = props["data"]
                ref = data_schema.get("$ref")
                items_ref = data_schema.get("items", {}).get("$ref") if "items" in data_schema else None
                if ref:
                    dto_name = resolve_ref(ref)
                    if dto_name:
                        info["resp_dto"] = dto_name
                        info["resp_fields"] = get_schema_fields(dto_name)
                elif items_ref:
                    dto_name = resolve_ref(items_ref)
                    if dto_name:
                        info["resp_dto"] = dto_name + "[]"
                        info["resp_fields"] = get_schema_fields(dto_name)
                        info["resp_is_array"] = True
                else:
                    info["resp_dto"] = data_schema.get("type", "object")
        break

    return info


swagger_endpoints = {}
for path, methods in spec.get("paths", {}).items():
    for method, op in methods.items():
        if method == "post":
            swagger_endpoints[path] = get_endpoint_info(path, op)
            swagger_endpoints[path]["tags"] = op.get("tags", [])
            swagger_endpoints[path]["summary"] = op.get("summary", "")


# ─── 2. 解析前端 API 文件 ─────────────────────────────────────────────

def parse_ts_type_fields(content, type_name):
    """
    从 TS 文件内容中提取 type/interface Xxx = { ... } 的所有字段名。
    返回 dict: { field: ts_type_str }
    """
    # Match: export type TypeName = { ... }
    # or: type TypeName = { ... }
    patterns = [
        rf"(?:export\s+)?type\s+{re.escape(type_name)}\s*=\s*\{{([^}}]*(?:\{{[^}}]*\}}[^}}]*)*)\}}",
        rf"(?:export\s+)?interface\s+{re.escape(type_name)}\s*\{{([^}}]*(?:\{{[^}}]*\}}[^}}]*)*)\}}",
    ]
    for pat in patterns:
        m = re.search(pat, content, re.DOTALL)
        if m:
            body = m.group(1)
            fields = {}
            # Extract field: type pairs (skip comments)
            for line in body.split("\n"):
                line = line.strip()
                if not line or line.startswith("//") or line.startswith("/*") or line.startswith("*"):
                    continue
                # field?: type;  or  field: type;
                fm = re.match(r"(\w+)\s*\??:\s*(.+?);\s*(?://.*)?$", line)
                if fm:
                    fields[fm.group(1)] = fm.group(2).strip()
            return fields
    return None


def parse_api_file(filepath):
    """
    解析一个 src/api/*.ts 文件，提取每个 API 调用:
    - URL
    - 请求参数字段（从函数参数中内联的对象字面量 or 引用的类型名）
    - 返回类型名
    """
    with open(filepath) as f:
        content = f.read()

    calls = []

    # Pattern 1: apiClient.post<ReturnType>('/api/xxx', body)
    # Find all apiClient.post calls
    post_pattern = re.compile(
        r"apiClient\.post<([^>]+)>\(\s*'(/api/[^']+)'\s*(?:,\s*([^)]*))?\)",
        re.DOTALL,
    )

    for m in post_pattern.finditer(content):
        return_type = m.group(1).strip()
        url = m.group(2).strip()
        body_arg = m.group(3).strip() if m.group(3) else None

        # Try to figure out the request param fields
        req_fields = {}
        req_type_name = None

        if body_arg:
            # Direct inline: { tsCode, days } or { code: tsCode }
            inline_match = re.match(r"\{([^}]+)\}", body_arg)
            if inline_match:
                for part in inline_match.group(1).split(","):
                    part = part.strip()
                    if ":" in part:
                        key = part.split(":")[0].strip()
                    else:
                        key = part.strip()
                    if key and re.match(r"^\w+$", key):
                        req_fields[key] = "inline"
            # Variable reference: query, data, dto, params
            elif re.match(r"^\w+$", body_arg.split("??")[0].strip()):
                var_name = body_arg.split("??")[0].strip()
                # Find the function that contains this call and extract parameter type
                # Look backwards from the match position for function signature
                before = content[:m.start()]
                # Find the closest function/arrow signature
                func_pat = re.compile(
                    r"(?:function\s+\w+|(?:export\s+)?(?:async\s+)?(?:function\s+)?(\w+)\s*[:=]\s*(?:\([^)]*\)\s*(?::\s*[^=]+?)?\s*=>|async\s*\([^)]*\)\s*(?::\s*[^=]+?)?\s*=>|function))"
                )
                # Simpler: find the parameter type annotation
                # e.g. (query: SomeType) or (query?: { field: type })
                param_pat = re.compile(
                    rf"{re.escape(var_name)}\s*\??\s*:\s*(\w+(?:\s*&\s*\{{[^}}]*\}})?)",
                )
                pm = None
                for pm in param_pat.finditer(before[-500:]):
                    pass  # Get last match
                if pm:
                    type_ref = pm.group(1).strip()
                    if type_ref.startswith("{"):
                        pass  # inline type
                    else:
                        req_type_name = type_ref
                        # Try to resolve this type
                        fields = parse_ts_type_fields(content, type_ref)
                        if fields:
                            req_fields = fields

        # Parse the return type fields
        resp_type_name = return_type
        # Clean up: remove wrappers like { data: X[] }
        is_array = return_type.endswith("[]")
        base_return = return_type.rstrip("[]").strip()

        resp_fields = parse_ts_type_fields(content, base_return)

        calls.append({
            "file": str(filepath.relative_to(ROOT)),
            "url": url,
            "return_type": return_type,
            "return_type_base": base_return,
            "resp_fields": resp_fields,
            "req_fields": req_fields,
            "req_type_name": req_type_name,
            "is_array": is_array,
        })

    return calls, content


# Collect all frontend API calls
all_calls = []
all_contents = {}  # file -> content

for ts_file in sorted(API_DIR.glob("*.ts")):
    if ts_file.name in ("client.ts", "index.ts", "export.ts"):
        continue
    calls, content = parse_api_file(ts_file)
    all_calls.extend(calls)
    all_contents[str(ts_file.relative_to(ROOT))] = content

# Build URL -> frontend_call map
frontend_by_url = {}
for call in all_calls:
    frontend_by_url[call["url"]] = call


# ─── 3. 对比分析 ─────────────────────────────────────────────────────

def to_snake(name):
    """camelCase -> snake_case"""
    s1 = re.sub(r"([A-Z])", r"_\1", name)
    return s1.lower().lstrip("_")


def to_camel(name):
    """snake_case -> camelCase"""
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def fields_match(fe_field, be_field):
    """Check if frontend and backend field names match (considering naming conventions)"""
    if fe_field == be_field:
        return True
    if to_snake(fe_field) == be_field or to_camel(be_field) == fe_field:
        return True
    if fe_field.lower() == be_field.lower():
        return True
    return False


def find_match(fe_field, be_fields):
    """Find matching backend field for a frontend field"""
    for bf in be_fields:
        if fields_match(fe_field, bf):
            return bf
    return None


issues = []

# 3a. URL existence checks
frontend_urls = set(frontend_by_url.keys())
swagger_urls = set(swagger_endpoints.keys())

only_frontend = frontend_urls - swagger_urls
only_swagger = swagger_urls - frontend_urls

for url in sorted(only_frontend):
    call = frontend_by_url[url]
    issues.append({
        "severity": "WARN",
        "type": "DEAD_ENDPOINT",
        "url": url,
        "file": call["file"],
        "message": f"前端调用了 {url}，但 swagger 中不存在此端点",
    })

for url in sorted(only_swagger):
    issues.append({
        "severity": "INFO",
        "type": "UNUSED_ENDPOINT",
        "url": url,
        "message": f"swagger 定义了 {url}，但前端未调用",
        "tags": swagger_endpoints[url].get("tags", []),
    })

# 3b. Request param field comparison
for url in sorted(frontend_urls & swagger_urls):
    fe = frontend_by_url[url]
    be = swagger_endpoints[url]

    fe_req = fe["req_fields"]
    be_req = be["req_fields"]

    if not be_req:
        # Backend expects no body
        if fe_req:
            # Frontend sends body but backend doesn't expect it — this is OK for empty {}
            non_trivial = {k for k in fe_req if k not in ("signal",)}
            if non_trivial and list(fe_req.values()) != ["inline"]:
                issues.append({
                    "severity": "WARN",
                    "type": "REQ_UNEXPECTED_BODY",
                    "url": url,
                    "file": fe["file"],
                    "message": f"后端无 requestBody，但前端发送了参数: {list(fe_req.keys())}",
                })
        continue

    if not fe_req:
        # Frontend sends no body (or we couldn't parse it), skip
        continue

    be_field_names = set(be_req.keys())
    fe_field_names = set(fe_req.keys())

    # Fields frontend sends but backend doesn't expect
    for ff in sorted(fe_field_names):
        matched = find_match(ff, be_field_names)
        if not matched:
            issues.append({
                "severity": "ERROR",
                "type": "REQ_EXTRA_FIELD",
                "url": url,
                "file": fe["file"],
                "field": ff,
                "message": f"前端发送了字段 '{ff}'，但后端 DTO({be['req_dto']}) 中无此字段。后端期望: {sorted(be_field_names)}",
            })

    # Fields backend requires but frontend doesn't send
    for bf in sorted(be_field_names):
        if be_req[bf].get("required"):
            matched = find_match(bf, fe_field_names)
            if not matched:
                issues.append({
                    "severity": "WARN",
                    "type": "REQ_MISSING_REQUIRED",
                    "url": url,
                    "file": fe["file"],
                    "field": bf,
                    "message": f"后端 DTO({be['req_dto']}) 要求字段 '{bf}'(required)，但前端未发送",
                })

    # Naming convention mismatches (camelCase vs snake_case)
    for ff in sorted(fe_field_names):
        if ff in be_field_names:
            continue
        camel = to_camel(ff) if "_" in ff else ff
        snake = to_snake(ff) if ff != to_snake(ff) else ff
        if snake in be_field_names and ff != snake:
            issues.append({
                "severity": "ERROR",
                "type": "REQ_NAMING_MISMATCH",
                "url": url,
                "file": fe["file"],
                "field": ff,
                "message": f"前端发送 '{ff}' (camelCase)，后端期望 '{snake}' (snake_case)",
                "fix": f"将请求参数 '{ff}' 改为 '{snake}'",
            })
        elif camel in be_field_names and ff != camel:
            issues.append({
                "severity": "WARN",
                "type": "REQ_NAMING_MISMATCH",
                "url": url,
                "file": fe["file"],
                "field": ff,
                "message": f"前端发送 '{ff}' (snake_case)，后端期望 '{camel}' (camelCase)",
            })

# 3c. Response field comparison
for url in sorted(frontend_urls & swagger_urls):
    fe = frontend_by_url[url]
    be = swagger_endpoints[url]

    fe_resp = fe.get("resp_fields")
    be_resp = be.get("resp_fields")

    if not fe_resp or not be_resp:
        continue

    be_field_names = set(be_resp.keys())
    fe_field_names = set(fe_resp.keys())

    # Skip ResponseModel fields
    be_field_names -= {"code", "data", "message"}
    fe_field_names -= {"code", "data", "message"}

    if not be_field_names:
        continue

    # Fields frontend expects but backend doesn't return
    for ff in sorted(fe_field_names):
        matched = find_match(ff, be_field_names)
        if not matched:
            issues.append({
                "severity": "ERROR",
                "type": "RESP_EXTRA_FIELD",
                "url": url,
                "file": fe["file"],
                "field": ff,
                "return_type": fe["return_type"],
                "message": f"前端类型 {fe['return_type_base']} 期望字段 '{ff}'，但后端 DTO({be['resp_dto']}) 不返回此字段。后端返回: {sorted(be_field_names)}",
            })

    # Fields backend returns but frontend doesn't use
    for bf in sorted(be_field_names):
        matched = find_match(bf, fe_field_names)
        if not matched:
            issues.append({
                "severity": "INFO",
                "type": "RESP_UNUSED_FIELD",
                "url": url,
                "file": fe["file"],
                "field": bf,
                "message": f"后端返回字段 '{bf}'({be['resp_dto']})，但前端类型 {fe['return_type_base']} 未声明",
            })

    # Array vs non-array mismatch
    if fe["is_array"] != be.get("resp_is_array", False):
        if be["resp_dto"] and be["resp_dto"].endswith("[]") != fe["is_array"]:
            issues.append({
                "severity": "ERROR",
                "type": "RESP_ARRAY_MISMATCH",
                "url": url,
                "file": fe["file"],
                "message": f"前端期望 {'数组' if fe['is_array'] else '对象'}，后端返回 {'数组' if be.get('resp_is_array') else '对象'}",
            })

    # Naming convention in response
    for ff in sorted(fe_field_names):
        if ff in be_field_names:
            continue
        snake = to_snake(ff)
        camel = to_camel(ff) if "_" in ff else ff
        if snake in be_field_names and ff != snake:
            issues.append({
                "severity": "ERROR",
                "type": "RESP_NAMING_MISMATCH",
                "url": url,
                "file": fe["file"],
                "field": ff,
                "message": f"前端用 '{ff}' (camelCase)，后端返回 '{snake}' (snake_case)。需确认后端实际返回的命名风格",
            })


# ─── 4. 输出报告 ─────────────────────────────────────────────────────

# Count by severity
error_count = sum(1 for i in issues if i["severity"] == "ERROR")
warn_count = sum(1 for i in issues if i["severity"] == "WARN")
info_count = sum(1 for i in issues if i["severity"] == "INFO")

if "--json" in sys.argv:
    print(json.dumps({"issues": issues, "summary": {
        "total": len(issues),
        "errors": error_count,
        "warnings": warn_count,
        "info": info_count,
        "frontend_endpoints": len(frontend_urls),
        "swagger_endpoints": len(swagger_urls),
        "matched": len(frontend_urls & swagger_urls),
    }}, ensure_ascii=False, indent=2))
    sys.exit(0)

print("=" * 70)
print("  前端 ↔ Swagger 深度联调校验报告")
print("=" * 70)
print()
print(f"  前端调用接口数:   {len(frontend_urls)}")
print(f"  Swagger POST端点: {len(swagger_urls)}")
print(f"  URL 完全匹配:     {len(frontend_urls & swagger_urls)}")
print(f"  仅前端有:         {len(only_frontend)}")
print(f"  仅 Swagger 有:    {len(only_swagger)}")
print()
print(f"  ❌ ERROR (必须修复): {error_count}")
print(f"  ⚠️  WARN (建议修复):  {warn_count}")
print(f"  ℹ️  INFO (仅供参考):  {info_count}")
print()

# Group issues by type
by_type = defaultdict(list)
for issue in issues:
    by_type[issue["type"]].append(issue)

type_labels = {
    "DEAD_ENDPOINT": "💀 前端调用了 Swagger 中不存在的端点",
    "UNUSED_ENDPOINT": "📭 Swagger 有但前端未调用的端点",
    "REQ_EXTRA_FIELD": "❌ 请求参数：前端多发了后端不认识的字段",
    "REQ_MISSING_REQUIRED": "⚠️  请求参数：后端要求的必填字段前端未发送",
    "REQ_NAMING_MISMATCH": "❌ 请求参数：命名风格不匹配 (camelCase↔snake_case)",
    "REQ_UNEXPECTED_BODY": "⚠️  请求参数：后端无 requestBody 但前端发送了参数",
    "RESP_EXTRA_FIELD": "❌ 响应字段：前端类型定义了后端不返回的字段",
    "RESP_UNUSED_FIELD": "📭 响应字段：后端返回了前端未声明的字段",
    "RESP_ARRAY_MISMATCH": "❌ 响应类型：数组 vs 对象不匹配",
    "RESP_NAMING_MISMATCH": "❌ 响应字段：命名风格不匹配",
}

# Print errors first, then warnings, then info
severity_order = {"ERROR": 0, "WARN": 1, "INFO": 2}
sorted_types = sorted(by_type.keys(), key=lambda t: (
    severity_order.get(by_type[t][0]["severity"], 9), t
))

for issue_type in sorted_types:
    items = by_type[issue_type]
    if not items:
        continue

    severity = items[0]["severity"]
    if severity == "INFO" and "--verbose" not in sys.argv:
        # Only show count for INFO
        label = type_labels.get(issue_type, issue_type)
        print(f"\n{label} ({len(items)} 个, 用 --verbose 查看详情)")
        if issue_type == "UNUSED_ENDPOINT":
            # Show first few
            for item in items[:5]:
                print(f"    {item['url']}")
            if len(items) > 5:
                print(f"    ... 及其他 {len(items) - 5} 个")
        continue

    label = type_labels.get(issue_type, issue_type)
    print(f"\n{'─' * 70}")
    print(f"{label} ({len(items)} 个)")
    print(f"{'─' * 70}")
    for item in items:
        print(f"\n  URL: {item['url']}")
        if item.get("file"):
            print(f"  文件: {item['file']}")
        if item.get("field"):
            print(f"  字段: {item['field']}")
        print(f"  说明: {item['message']}")
        if item.get("fix"):
            print(f"  修复: {item['fix']}")

print(f"\n{'=' * 70}")
print(f"  总计: {error_count} 个错误, {warn_count} 个警告, {info_count} 个信息")
print(f"{'=' * 70}")

sys.exit(1 if error_count > 0 else 0)
