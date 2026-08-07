import type {
  ModelAdapterKind,
  ModelProbeStepKey,
  ModelReasoningMode,
  ModelProviderDataClass,
  ModelProviderCapability,
} from 'src/api/model-provider';

export const PROBE_STEP_LABELS = {
  URL_POLICY: 'URL 安全策略',
  TLS: 'TLS 连接',
  AUTH: '连接与鉴权',
  MODEL: '模型与运行参数',
  REASONING: '默认推理策略',
  STRUCTURED_OUTPUT: '结构化输出',
  TOOLS: '工具调用',
  VISION: '视觉输入',
  STREAM: '流式完整性',
} satisfies Record<ModelProbeStepKey, string>;

export const ADAPTER_LABELS: Record<ModelAdapterKind, string> = {
  'openai-responses': 'OpenAI Responses',
  'openai-chat-compatible': 'OpenAI Chat Compatible',
  'anthropic-messages': 'Anthropic Messages',
};

export const CAPABILITY_OPTIONS: Array<{
  value: ModelProviderCapability;
  label: string;
}> = [
  { value: 'STREAMING', label: '流式输出' },
  { value: 'STRUCTURED_OUTPUT', label: '结构化输出' },
  { value: 'TOOL_CALLING', label: '工具调用' },
  { value: 'PARALLEL_TOOL_CALLING', label: '并行工具' },
  { value: 'VISION', label: '视觉输入' },
  { value: 'REASONING_EFFORT', label: '推理控制' },
];

export const DATA_CLASS_OPTIONS: Array<{ value: ModelProviderDataClass; label: string }> = [
  { value: 'PUBLIC', label: '公开数据' },
  { value: 'USER_PRIVATE', label: '用户私有' },
  { value: 'PORTFOLIO_SENSITIVE', label: '组合敏感' },
];

export const REASONING_MODE_LABELS: Record<ModelReasoningMode, string> = {
  AUTO: '跟随模型',
  DISABLED: '关闭推理',
  EFFORT: '推理档位',
  TOKEN_BUDGET: 'Token 预算',
};

export const COMMON_REASONING_EFFORTS = [
  'NONE',
  'MINIMAL',
  'LOW',
  'MEDIUM',
  'HIGH',
  'XHIGH',
  'MAX',
] as const;

export const CONNECTION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
export const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,255}$/;
export const REASONING_EFFORT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
