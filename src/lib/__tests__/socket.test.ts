import type { Socket } from 'socket.io-client';

const { mockIo, mockSocket } = vi.hoisted(() => {
  const socket = {
    auth: {} as Socket['auth'],
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    onAny: vi.fn(),
    listeners: vi.fn(() => []),
    io: { on: vi.fn() },
  };
  const createSocket = vi.fn((_url: string, options?: { auth?: Socket['auth'] }) => {
    socket.auth = options?.auth ?? {};
    return socket;
  });
  return { mockIo: createSocket, mockSocket: socket };
});

vi.mock('socket.io-client', () => ({ io: mockIo }));

import { tokenStorage } from 'src/api/client';

import { getSocket, destroySocket, refreshSocketAuth } from '../socket';

describe('WebSocket authentication lifecycle', () => {
  beforeEach(() => {
    destroySocket();
    tokenStorage.clear();
    mockIo.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
    mockSocket.onAny.mockClear();
    mockSocket.io.on.mockClear();
    mockSocket.connected = false;
    mockSocket.auth = {} as Socket['auth'];
  });

  it('uses the current in-memory access token in Socket.IO handshake auth', () => {
    tokenStorage.set('access-token-a');

    getSocket();

    const options = mockIo.mock.calls[0]?.[1] as { auth: (callback: (data: object) => void) => void };
    const callback = vi.fn();
    options.auth(callback);
    expect(callback).toHaveBeenCalledWith({ token: 'access-token-a' });
  });

  it('token refresh reconnects an existing socket and supplies the replacement token', () => {
    getSocket();
    mockSocket.connected = true;
    tokenStorage.set('access-token-b');

    refreshSocketAuth();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    const callback = vi.fn();
    (mockSocket.auth as (callback: (data: object) => void) => void)(callback);
    expect(callback).toHaveBeenCalledWith({ token: 'access-token-b' });
  });

  it('does not create or connect a socket before one is needed', () => {
    refreshSocketAuth();

    expect(mockIo).not.toHaveBeenCalled();
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('does not register unsupported timestamp replay events', () => {
    getSocket();

    expect(mockSocket.onAny).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalledWith('replay_missed_events', expect.any(Object));
  });

  it('destroySocket disconnects and releases the singleton', () => {
    getSocket();

    destroySocket();
    getSocket();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(mockIo).toHaveBeenCalledTimes(2);
  });
});
