import { Module } from '@nestjs/common';
import { MongoConnectionService } from './mongo-connection.service';
import { MONGO_SYNC_MODELS, type MongoSyncModel } from './mongodb.constants';
import { MongoOptions } from './mongodb.options';

export { MONGO_SYNC_MODELS, type MongoSyncModel };

@Module({
  providers: [MongoOptions, MongoConnectionService],
  exports: [MongoConnectionService],
})
export class MongoDbModule {}
