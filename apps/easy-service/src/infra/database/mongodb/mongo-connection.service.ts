import { Inject, Injectable, InternalServerErrorException, Logger, OnApplicationShutdown, OnModuleInit, Optional } from '@nestjs/common';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import { messageModel } from './schema/message.schema';
import { MONGO_SYNC_MODELS, type MongoSyncModel } from './mongodb.constants';
import { MongoOptions } from './mongodb.options';

@Injectable()
export class MongoConnectionService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MongoConnectionService.name);
  private static isConnected = false;
  private static gridFsBucketImages: GridFSBucket | undefined;

  constructor(
    private readonly options: MongoOptions,
    @Optional()
    @Inject(MONGO_SYNC_MODELS)
    private readonly syncModels: MongoSyncModel[] = [],
  ) {}

  async onModuleInit(): Promise<void> {
    if (MongoConnectionService.isConnected) {
      this.logger.verbose('MongoDb already connected. Skipping new connection.');
      return;
    }

    try {
      const connection = await mongoose.connect(this.options.uri, {
        autoIndex: true,
      });

      this.logger.debug(`Application connected to mongo: ${this.options.uri}`);

      const db = connection.connection.db;
      if (!db) {
        throw new InternalServerErrorException('MongoDB database handle missing after connect');
      }

      MongoConnectionService.gridFsBucketImages = new GridFSBucket(db, { bucketName: 'images' });
      MongoConnectionService.isConnected = true;

      this.logger.verbose(`MongoDb connected successfully ${this.options.uri}`);
      this.logger.verbose('GridFSBucket initialized: images');

      await this.rebuildMessageIndexes();
      await this.syncIndex();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MongoDb connection error: ${message}: ${this.options.uri}`);
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (MongoConnectionService.isConnected) {
      await mongoose.disconnect();
      MongoConnectionService.isConnected = false;
      MongoConnectionService.gridFsBucketImages = undefined;
    }
  }

  assertConnected(): void {
    const conn = mongoose.connection ?? mongoose.connections[0];
    const isMongooseConnected = conn != null && conn.readyState === 1;
    if (!MongoConnectionService.isConnected || !isMongooseConnected) {
      throw new InternalServerErrorException('MongoDB must be connected before this operation');
    }
  }

  static getBucketImages(): GridFSBucket {
    if (!MongoConnectionService.gridFsBucketImages) {
      throw new InternalServerErrorException('GridFSBucket not initialized');
    }

    return MongoConnectionService.gridFsBucketImages;
  }

  private async rebuildMessageIndexes(): Promise<void> {
    try {
      // Drop the stale non-sparse whatsappMessageId index if it exists, then syncIndexes
      // recreates it correctly as sparse so null/absent values no longer collide.
      await messageModel.collection.dropIndex('whatsappMessageId_1').catch(() => {
        // Index may already be correct or not exist — safe to ignore
      });
      await messageModel.syncIndexes();
      this.logger.verbose('messages: whatsappMessageId index rebuilt as sparse');
    } catch (err: unknown) {
      this.logger.warn(`messages: index rebuild skipped — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async syncIndex(): Promise<void> {
    if (!this.syncModels.length) return;

    const results = await Promise.allSettled(
      this.syncModels.map(async (model: MongoSyncModel): Promise<void> => {
        await model.syncIndexes();
      }),
    );

    results.forEach((result: PromiseSettledResult<void>, index: number): void => {
      const modelName = this.syncModels[index].modelName;
      if (result.status === 'fulfilled') {
        this.logger.verbose(`${modelName}: indexes synced successfully`);
      } else {
        this.logger.error(`${modelName}: Failed to sync indexes - ${result.reason}`);
      }
    });
  }
}
