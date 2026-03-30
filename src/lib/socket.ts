import { io, type Socket } from 'socket.io-client';

// ----------------------------------------------------------------------
// Socket.io 客户端单例
// WS 命名空间: /ws
// 开发环境: 通过 Vite 代理 /socket.io → localhost:3000
// 生产环境: 通过 VITE_WS_URL 配置目标地址
// ----------------------------------------------------------------------

const WS_BASE_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(`${WS_BASE_URL}/ws`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });
  }
  return _socket;
}

export function destroySocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
