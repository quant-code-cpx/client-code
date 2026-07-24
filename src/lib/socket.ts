import type { Socket } from 'socket.io-client';

import { io } from 'socket.io-client';

import { tokenStorage } from 'src/api/client';

// ----------------------------------------------------------------------
// Socket.io 客户端单例
// WS 命名空间: /ws
// 开发环境: 通过 Vite 代理 /socket.io → localhost:3000
// 生产环境: 通过 VITE_WS_URL 配置目标地址
// ----------------------------------------------------------------------

const WS_BASE_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';

let _socket: Socket | null = null;

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
      // 每次初始连接和重连都读取最新内存 token，绝不放入 query string。
      auth: (callback) => callback({ token: tokenStorage.get() ?? '' }),
      // 显式配置重连参数
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    setupStatusTracking(_socket);
  }
  return _socket;
}

/** Token 刷新后用新凭据重新握手；未创建 socket 时不主动创建连接。 */
export function refreshSocketAuth(): void {
  if (!_socket) return;
  if (_socket.connected) _socket.disconnect();
  _socket.connect();
}

export function destroySocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  setStatus('disconnected');
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
