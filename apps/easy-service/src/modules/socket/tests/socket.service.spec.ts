import { Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import { SocketService } from '../app/socket.service';

function createMockServer(): { server: Server; to: jest.Mock; emit: jest.Mock } {
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });
  const server = { to } as unknown as Server;
  return { server, to, emit };
}

describe('SocketService', (): void => {
  let service: SocketService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach((): void => {
    service = new SocketService();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation((): void => {});
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation((): void => {});
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
  });

  afterEach((): void => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('emit', (): void => {
    it('should throw when topic is not a non-empty string', (): void => {
      expect((): void => service.emit('room', '', { a: 1 })).toThrow('emit: topic must be a non-empty string');
      expect((): void => service.emit('room', '   ', { a: 1 })).toThrow('emit: topic must be a non-empty string');
    });

    it('should log emitting event and workspace room', (): void => {
      const { server } = createMockServer();
      service.attachServer(server);
      service.emit('ws-1', 'new-connection', { id: '1' });

      expect(logSpy).toHaveBeenCalledWith('Emitting event=new-connection workspaceId=ws-1 object={"id":"1"}');
    });

    it('should warn and skip emit when server is not attached', (): void => {
      service.emit('ws-1', 'error', { x: 1 });

      expect(warnSpy).toHaveBeenCalledWith('emit skipped: socket server not ready');
      expect(logSpy).toHaveBeenCalled();
    });

    it('should emit named event and payload to the workspace room', (): void => {
      const { server, to, emit } = createMockServer();
      service.attachServer(server);
      const payload = { foo: 'bar' };

      service.emit('room-a', 'connected', payload);

      expect(to).toHaveBeenCalledWith('room-a');
      expect(emit).toHaveBeenCalledWith('connected', payload);
    });
  });

  describe('listen', (): void => {
    it('should throw when topic is invalid', (): void => {
      expect((): void => service.listen('', jest.fn())).toThrow('listen: topic must be a non-empty string');
    });

    it('should throw when listener is not a function', (): void => {
      expect((): void => service.listen('t', null as unknown as () => void)).toThrow('listen: listener must be a function');
    });

    it('should return unsubscribe that removes the listener', (): void => {
      const fn = jest.fn();
      const unsub = service.listen('topic-x', fn);

      service.dispatchIncoming('topic-x', { n: 1 });
      expect(fn).toHaveBeenCalledTimes(1);

      unsub();
      service.dispatchIncoming('topic-x', { n: 2 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should invoke all listeners registered for the same topic', (): void => {
      const a = jest.fn();
      const b = jest.fn();
      service.listen('same', a);
      service.listen('same', b);

      service.dispatchIncoming('same', { v: true });

      expect(a).toHaveBeenCalledWith({ v: true });
      expect(b).toHaveBeenCalledWith({ v: true });
    });
  });

  describe('dispatchIncoming', (): void => {
    it('should not throw and not call listeners for invalid topic', (): void => {
      const fn = jest.fn();
      service.listen('ok', fn);

      service.dispatchIncoming('', { a: 1 });
      service.dispatchIncoming('   ', { a: 1 });

      expect(fn).not.toHaveBeenCalled();
    });

    it('should log incoming topic and object', (): void => {
      service.dispatchIncoming('in', { k: 2 });

      expect(logSpy).toHaveBeenCalledWith('incoming topic="in" object={"k":2}');
    });

    it('should log [Unserializable] when payload cannot be JSON stringified', (): void => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      service.dispatchIncoming('c', circular);

      expect(logSpy).toHaveBeenCalledWith('incoming topic="c" object=[Unserializable]');
    });

    it('should call listener with payload', (): void => {
      const fn = jest.fn();
      service.listen('events', fn);

      service.dispatchIncoming('events', { id: 99 });

      expect(fn).toHaveBeenCalledWith({ id: 99 });
    });

    it('should log error and continue when a listener throws', (): void => {
      const throwing = jest.fn((): void => {
        throw new Error('fail');
      });
      const other = jest.fn();
      service.listen('t', throwing);
      service.listen('t', other);

      service.dispatchIncoming('t', {});

      expect(errorSpy).toHaveBeenCalled();
      expect(other).toHaveBeenCalled();
    });
  });

  describe('attachServer', (): void => {
    it('should allow emit after server is attached', (): void => {
      const { server, to, emit } = createMockServer();
      service.attachServer(server);

      service.emit('z', 'error', 42);

      expect(to).toHaveBeenCalledWith('z');
      expect(emit).toHaveBeenCalledWith('error', 42);
    });
  });

  describe('disconnectUserSockets', (): void => {
    it('should no-op when userId is empty', (): void => {
      const disconnectSockets = jest.fn();
      const server = { in: jest.fn().mockReturnValue({ disconnectSockets }) } as unknown as Server;
      service.attachServer(server);

      service.disconnectUserSockets('');
      service.disconnectUserSockets('   ');

      expect(server.in).not.toHaveBeenCalled();
    });

    it('should disconnect sockets in user room', (): void => {
      const disconnectSockets = jest.fn();
      const roomChain = { disconnectSockets };
      const server = { in: jest.fn().mockReturnValue(roomChain) } as unknown as Server;
      service.attachServer(server);

      service.disconnectUserSockets('user-1');

      expect(server.in).toHaveBeenCalledWith('user:user-1');
      expect(disconnectSockets).toHaveBeenCalledWith(true);
      expect(logSpy).toHaveBeenCalledWith('Session handshake undone (server) userId=user-1 reason=logout_or_invalidation allSocketsInUserRoom');
    });
  });
});
