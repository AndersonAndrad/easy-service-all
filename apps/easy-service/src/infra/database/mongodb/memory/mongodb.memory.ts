import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection } from 'mongoose';

export class MongoInMemory {
  private constructor(
    private readonly mongoServer: MongoMemoryServer,
    private readonly mongoConnection: Connection,
  ) {}

  public static async startServer(): Promise<MongoInMemory> {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    const mongoConnection = (await connect(mongoUri)).connection;

    process.env.MONGODB_URI = mongoUri;

    return new MongoInMemory(mongoServer, mongoConnection);
  }

  public async shutdown(): Promise<void> {
    await this.mongoConnection.dropDatabase();
    await this.mongoConnection.close();
    await this.mongoServer.stop();
  }

  public async clearCollections(): Promise<void> {
    const collections = this.mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
}
