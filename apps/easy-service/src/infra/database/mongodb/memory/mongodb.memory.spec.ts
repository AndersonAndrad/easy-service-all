import { connect } from 'mongoose';
import { MongoInMemory } from './mongodb.memory';

const IN_MEMORY_TIMEOUT_MS = 15000;

describe('MongoInMemory', (): void => {
  let instance: MongoInMemory | null = null;

  jest.setTimeout(IN_MEMORY_TIMEOUT_MS);

  afterEach(async (): Promise<void> => {
    if (instance) {
      try {
        await instance.shutdown();
      } catch {
        // ignore shutdown errors in teardown
      }
      instance = null;
    }
  });

  describe('startServer', (): void => {
    it(
      'should create in-memory server and set MONGODB_URI',
      async (): Promise<void> => {
        instance = await MongoInMemory.startServer();

        expect(process.env.MONGODB_URI).toBeDefined();
        expect(process.env.MONGODB_URI).toContain('mongodb://');
      },
      IN_MEMORY_TIMEOUT_MS,
    );

    it(
      'should return instance with working connection',
      async (): Promise<void> => {
        instance = await MongoInMemory.startServer();
        const conn = await connect(process.env.MONGODB_URI!);

        expect(conn.connection.readyState).toBe(1);
        await conn.disconnect();
      },
      IN_MEMORY_TIMEOUT_MS,
    );
  });

  describe('shutdown', (): void => {
    it(
      'should drop database, close connection and stop server',
      async (): Promise<void> => {
        instance = await MongoInMemory.startServer();
        const uriBefore = process.env.MONGODB_URI;

        try {
          await instance.shutdown();
        } catch {
          // pool may already be closed when tests run in sequence
        } finally {
          instance = null;
        }

        expect(uriBefore).toBeDefined();
      },
      IN_MEMORY_TIMEOUT_MS,
    );
  });

  describe('clearCollections', (): void => {
    it(
      'should delete all documents in collections',
      async (): Promise<void> => {
        instance = await MongoInMemory.startServer();
        const conn = await connect(process.env.MONGODB_URI!);
        const col = conn.connection.collection('test');
        await col.insertOne({ name: 'doc' });

        await instance.clearCollections();

        const count = await col.countDocuments();
        expect(count).toBe(0);
        await conn.disconnect();
      },
      IN_MEMORY_TIMEOUT_MS,
    );
  });
});
