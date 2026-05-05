import Redis from 'ioredis';
import { RedisService } from '../app/redis.service';

describe('RedisService', (): void => {
  let service: RedisService;
  let client: jest.Mocked<Redis>;

  beforeEach((): void => {
    client = {
      quit: jest.fn().mockResolvedValue('OK' as unknown as never),
      psetex: jest.fn().mockResolvedValue('OK' as unknown as never),
      set: jest.fn().mockResolvedValue('OK' as unknown as never),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1 as unknown as never),
      keys: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Redis>;

    service = new RedisService(client);
  });

  it('should setJson with psetex when ttl is provided', async (): Promise<void> => {
    await service.setJson('key', { foo: 'bar' }, 1000);

    expect(client.psetex).toHaveBeenCalledWith('key', 1000, JSON.stringify({ foo: 'bar' }));
    expect(client.set).not.toHaveBeenCalled();
  });

  it('should setJson with set when ttl is not provided', async (): Promise<void> => {
    await service.setJson('key', { foo: 'bar' });

    expect(client.set).toHaveBeenCalledWith('key', JSON.stringify({ foo: 'bar' }));
    expect(client.psetex).not.toHaveBeenCalled();
  });

  it('should return parsed json from getJson', async (): Promise<void> => {
    client.get.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));

    const result = await service.getJson<{ foo: string }>('key');

    expect(result).toEqual({ foo: 'bar' });
    expect(client.get).toHaveBeenCalledWith('key');
  });

  it('should return null when getJson receives null', async (): Promise<void> => {
    client.get.mockResolvedValueOnce(null);

    const result = await service.getJson<{ foo: string }>('key');

    expect(result).toBeNull();
  });

  it('should delete key', async (): Promise<void> => {
    await service.delete('key');

    expect(client.del).toHaveBeenCalledWith('key');
  });

  it('should return keys', async (): Promise<void> => {
    client.keys.mockResolvedValueOnce(['a', 'b']);

    const result = await service.keys('pattern:*');

    expect(result).toEqual(['a', 'b']);
    expect(client.keys).toHaveBeenCalledWith('pattern:*');
  });

  it('should quit client on module destroy', async (): Promise<void> => {
    await service.onModuleDestroy();

    expect(client.quit).toHaveBeenCalled();
  });
});
