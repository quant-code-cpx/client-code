import type { Socket } from 'socket.io-client';

import { io } from 'socket.io-client';

// ----------------------------------------------------------------------
// Socket.io 客户端单例
// WS 命名空间: /ws
// 开发环境: 通过 Vite 代理 /socket.io → localhost:3000
// 生产环境: 通过 VITE_WS_URL 配置目标地址
// ----------------------------------------------------------------------

const WS_BASE_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';

let _socket: Socket | null = null;

/** 最近一次收到事件的时间戳（毫秒），用于重连后请求回放 */
let lastEventTimestamp: number = Date.now();

// ── 连接状态管理 ────────────────────────────────────────────────
export type SocketStatus = 'connected' | 'reconnecting' | 'disconnected';

type StatusListener = (status: SocketStatus) => void;
const _statusListeners = new Set<StatusListener>();
let _currentStatus: SocketStatus = 'disconnected';

function setStatus(status: SocketStatus) {
  if (_currentStatus === status) return;
  _currentStatus = status;
  _statusListeners.forEach((fn) => fn(status));
}

export function getSocketStatus(): SocketStatus {
  return _currentStatus;
}

export function onSocketStatusChange(listener: StatusListener): () => void {
  _statusListeners.add(listener);
  return () => {
    _statusListeners.delete(listener);
  };
}

// ── Socket 工厂 ─────────────────────────────────────────────────

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(`${WS_BASE_URL}/ws`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      // 显式配置重连参数
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    setupReconnectReplay(_socket);
    setupStatusTracking(_socket);
  }
  return _socket;
}

export function destroySocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  setStatus('disconnected');
}

// ── 重连事件回放 ────────────────────────────────────────────────

function setupReconnectReplay(socket: Socket): void {
  // 每次收到事件，更新时间戳
  socket.onAny(() => {
    lastEventTimestamp = Date.now();
  });

  // 重连后请求回放离线期间事件
  socket.io.on('reconnect', () => {
    socket.emit('replay_missed_events', { since: lastEventTimestamp });
  });

  // 接收回放批次
  socket.on('replayed_events', (events: Array<{ event: string; data: unknown }>) => {
    events.forEach(({ event, data }) => {
      socket.listeners(event).forEach((fn) => {
        (fn as (d: unknown) => void)(data);
      });
    });
  });
}

// ── 连接状态跟踪 ────────────────────────────────────────────────

function setupStatusTracking(socket: Socket): void {
  socket.on('connect', () => {
    setStatus('connected');
  });

  socket.on('disconnect', () => {
    setStatus('disconnected');
  });

  socket.io.on('reconnect_attempt', () => {
    setStatus('reconnecting');
  });

  socket.io.on('reconnect', () => {
    setStatus('connected');
  });

  socket.io.on('reconnect_failed', () => {
    setStatus('disconnected');
  });
}
