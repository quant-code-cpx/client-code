import type { APIRequestContext } from '@playwright/test';

/**
 * 封装 POST /api/* 请求，自动解包 { code, data } 格式
 */
export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await request.post(path, { data: body ?? {} });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`API ${path} failed: ${json.message}`);
  return json.data as T;
}
