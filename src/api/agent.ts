import { authenticatedFetch } from './client';
import { AgentClientError, toAgentClientError } from './agent-error';

import type { paths } from './generated/agent-api';

const AGENT_JSON_PATHS = {
  createConversation: '/agent/conversations/create',
  listConversations: '/agent/conversations/list',
  getConversation: '/agent/conversations/detail',
  adoptConversationBranch: '/agent/conversations/branches/adopt',
  listMessages: '/agent/conversations/messages/list',
  updateConversationModel: '/agent/conversations/model/update',
  listModels: '/agent/models/list',
  sendMessage: '/agent/messages/send',
  regenerateMessage: '/agent/runs/regenerate',
  retryRun: '/agent/runs/retry',
  getRunStatus: '/agent/runs/status',
  cancelRun: '/agent/runs/cancel',
  listRunEvents: '/agent/runs/events/list',
  listToolCalls: '/agent/runs/tool-calls/list',
  listMemories: '/agent/memories/list',
  createMemory: '/agent/memories/create',
  updateMemory: '/agent/memories/update',
  deleteMemory: '/agent/memories/delete',
  createSchedule: '/agent/schedules/create',
  listSchedules: '/agent/schedules/list',
  getSchedule: '/agent/schedules/detail',
  updateSchedule: '/agent/schedules/update',
  pauseSchedule: '/agent/schedules/pause',
  resumeSchedule: '/agent/schedules/resume',
  deleteSchedule: '/agent/schedules/delete',
  listScheduleExecutions: '/agent/schedules/executions/list',
  listReports: '/agent/reports/list',
  getReport: '/agent/reports/detail',
  saveReport: '/agent/reports/save',
  deleteReport: '/agent/reports/delete',
  listNotificationChannels: '/agent/notification-channels/list',
  createNotificationChannel: '/agent/notification-channels/create',
  updateNotificationChannel: '/agent/notification-channels/update',
  testNotificationChannel: '/agent/notification-channels/test',
  deleteNotificationChannel: '/agent/notification-channels/delete',
  listNotificationDeliveries: '/agent/notification-deliveries/list',
  retryNotificationDelivery: '/agent/notification-deliveries/retry',
} as const;

export type AgentJsonPath = (typeof AGENT_JSON_PATHS)[keyof typeof AGENT_JSON_PATHS];

type PostOperation<Path extends string> = Path extends keyof paths
  ? Exclude<paths[Path]['post'], undefined>
  : never;
type JsonContent<Input> = Input extends { content: { 'application/json': infer Body } }
  ? Body
  : never;
type SuccessContent<Operation> = Operation extends { responses: infer Responses }
  ? {
      [Status in keyof Responses]: Status extends 200 | 201 | 202
        ? JsonContent<Responses[Status]>
        : never;
    }[keyof Responses]
  : never;
type UnwrapApiData<Input> = Input extends { data?: infer Data } ? Data : Input;

/**
 * Types become concrete when backend Agent paths land in Swagger. Until then they remain
 * unknown, avoiding a handwritten DTO copy that could drift from Batch 013.
 */
export type AgentRequest<Path extends AgentJsonPath> = [PostOperation<Path>] extends [never]
  ? unknown
  : PostOperation<Path> extends { requestBody: infer RequestBody }
    ? JsonContent<RequestBody>
    : undefined;
export type AgentResponse<Path extends AgentJsonPath> = [PostOperation<Path>] extends [never]
  ? unknown
  : UnwrapApiData<SuccessContent<PostOperation<Path>>>;

type ApiEnvelope = {
  code?: number;
  data?: unknown;
  message?: string | string[];
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

async function postAgent<Path extends AgentJsonPath>(
  path: Path,
  input: AgentRequest<Path>,
  signal?: AbortSignal
): Promise<AgentResponse<Path>> {
  const response = await authenticatedFetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: input === undefined ? undefined : JSON.stringify(input),
    signal,
  });
  if (!response.ok) throw await toAgentClientError(response);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new AgentClientError('Agent API 返回了非 JSON 响应', {
      kind: 'PROTOCOL',
      status: response.status,
    });
  }

  const text = await response.text();
  if (text.length > 4 * 1024 * 1024) {
    throw new AgentClientError('Agent API 响应超过大小限制', { kind: 'PROTOCOL' });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new AgentClientError('Agent API 返回了无效 JSON', {
      kind: 'PROTOCOL',
      cause: error,
    });
  }

  if (!isRecord(parsed) || typeof parsed.code !== 'number') {
    throw new AgentClientError('Agent API 返回了无效响应结构', {
      kind: 'PROTOCOL',
      status: response.status,
    });
  }
  const payload = parsed as ApiEnvelope;

  if (payload.code !== 0) {
    throw await toAgentClientError(payload);
  }
  if (!('data' in payload)) {
    throw new AgentClientError('Agent API 响应缺少 data 字段', {
      kind: 'PROTOCOL',
      status: response.status,
    });
  }
  return payload.data as AgentResponse<Path>;
}

type AgentMethod<Path extends AgentJsonPath> = (
  input: AgentRequest<Path>,
  signal?: AbortSignal
) => Promise<AgentResponse<Path>>;

function endpoint<Path extends AgentJsonPath>(path: Path): AgentMethod<Path> {
  return (input, signal) => postAgent(path, input, signal);
}

export const agentApi = {
  createConversation: endpoint(AGENT_JSON_PATHS.createConversation),
  listConversations: endpoint(AGENT_JSON_PATHS.listConversations),
  getConversation: endpoint(AGENT_JSON_PATHS.getConversation),
  adoptConversationBranch: endpoint(AGENT_JSON_PATHS.adoptConversationBranch),
  listMessages: endpoint(AGENT_JSON_PATHS.listMessages),
  updateConversationModel: endpoint(AGENT_JSON_PATHS.updateConversationModel),
  listModels: (signal?: AbortSignal) => postAgent(AGENT_JSON_PATHS.listModels, undefined, signal),
  sendMessage: endpoint(AGENT_JSON_PATHS.sendMessage),
  regenerateMessage: endpoint(AGENT_JSON_PATHS.regenerateMessage),
  retryRun: endpoint(AGENT_JSON_PATHS.retryRun),
  getRunStatus: endpoint(AGENT_JSON_PATHS.getRunStatus),
  cancelRun: endpoint(AGENT_JSON_PATHS.cancelRun),
  listRunEvents: endpoint(AGENT_JSON_PATHS.listRunEvents),
  listToolCalls: endpoint(AGENT_JSON_PATHS.listToolCalls),
  listMemories: endpoint(AGENT_JSON_PATHS.listMemories),
  createMemory: endpoint(AGENT_JSON_PATHS.createMemory),
  updateMemory: endpoint(AGENT_JSON_PATHS.updateMemory),
  deleteMemory: endpoint(AGENT_JSON_PATHS.deleteMemory),
  createSchedule: endpoint(AGENT_JSON_PATHS.createSchedule),
  listSchedules: endpoint(AGENT_JSON_PATHS.listSchedules),
  getSchedule: endpoint(AGENT_JSON_PATHS.getSchedule),
  updateSchedule: endpoint(AGENT_JSON_PATHS.updateSchedule),
  pauseSchedule: endpoint(AGENT_JSON_PATHS.pauseSchedule),
  resumeSchedule: endpoint(AGENT_JSON_PATHS.resumeSchedule),
  deleteSchedule: endpoint(AGENT_JSON_PATHS.deleteSchedule),
  listScheduleExecutions: endpoint(AGENT_JSON_PATHS.listScheduleExecutions),
  listReports: endpoint(AGENT_JSON_PATHS.listReports),
  getReport: endpoint(AGENT_JSON_PATHS.getReport),
  saveReport: endpoint(AGENT_JSON_PATHS.saveReport),
  deleteReport: endpoint(AGENT_JSON_PATHS.deleteReport),
  listNotificationChannels: endpoint(AGENT_JSON_PATHS.listNotificationChannels),
  createNotificationChannel: endpoint(AGENT_JSON_PATHS.createNotificationChannel),
  updateNotificationChannel: endpoint(AGENT_JSON_PATHS.updateNotificationChannel),
  testNotificationChannel: endpoint(AGENT_JSON_PATHS.testNotificationChannel),
  deleteNotificationChannel: endpoint(AGENT_JSON_PATHS.deleteNotificationChannel),
  listNotificationDeliveries: endpoint(AGENT_JSON_PATHS.listNotificationDeliveries),
  retryNotificationDelivery: endpoint(AGENT_JSON_PATHS.retryNotificationDelivery),
};
