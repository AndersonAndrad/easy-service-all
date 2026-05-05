export const MONGO_SYNC_MODELS = Symbol('MONGO_SYNC_MODELS');

export interface MongoSyncModel {
  modelName: string;
  syncIndexes(): Promise<void>;
}
