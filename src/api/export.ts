import { tokenStorage } from './client';

// ----------------------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

export type ExportFormat = 'csv' | 'xlsx';

export type ExportRequest = {
  format: ExportFormat;
  /** 后端定义的数据源标识 */
  source: string;
  /** 筛选参数（与对应列表接口一致） */
  params?: Record<string, unknown>;
  /** 自定义列（可选） */
  columns?: string[];
};

/**
 * 请求导出并下载文件。
 * 后端返回二进制流，前端直接触发浏览器下载。
 */
export async function exportData(request: ExportRequest): Promise<void> {
  const token = tokenStorage.get();

  const response = await fetch(`${BASE_URL}/api/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) throw new Error(`Export failed: ${response.status} ${response.statusText}`);

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const filename =
    disposition?.match(/filename="?(.+?)"?$/)?.[1] ?? `export-${Date.now()}.${request.format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
