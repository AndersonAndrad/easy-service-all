import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GridFSBucket } from 'mongodb';
import * as mongoose from 'mongoose';
import { MongoConnectionService } from './mongo-connection.service';
import { MONGO_SYNC_MODELS } from './mongodb.constants';
import { MongoOptions } from './mongodb.options';

jest.mock('mongoose', (): { connect: jest.Mock; disconnect: jest.Mock } => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('mongodb', (): { GridFSBucket: jest.Mock } => ({
  GridFSBucket: jest.fn().mockImplementation((): Record<string, unknown> => ({})),
}));

describe('MongoConnectionService', (): void => {
  const mockUri = 'mongodb://localhost:27017/test';
  const mockDb = {};
  const mockConnect = mongoose.connect as jest.Mock;
  const mockDisconnect = mongoose.disconnect as jest.Mock;

  let module: TestingModule;
  let mongoConnection: MongoConnectionService;

  beforeEach(async (): Promise<void> => {
    mockConnect.mockClear();
    mockDisconnect.mockClear();

    (MongoConnectionService as unknown as { isConnected: boolean }).isConnected = false;
    (MongoConnectionService as unknown as { gridFsBucketImages: GridFSBucket | undefined }).gridFsBucketImages = undefined;

    mockConnect.mockResolvedValue({
      connection: { db: mockDb },
    });
    mockDisconnect.mockResolvedValue(undefined);

    module = await Test.createTestingModule({
      providers: [MongoConnectionService, { provide: MongoOptions, useValue: { uri: mockUri } }],
    }).compile();

    mongoConnection = module.get(MongoConnectionService);
  });

  describe('onModuleInit', (): void => {
    it('should connect to mongoose and initialize GridFS bucket', async (): Promise<void> => {
      await mongoConnection.onModuleInit();

      expect(mockConnect).toHaveBeenCalledWith(mockUri, { autoIndex: true });
      expect(MongoConnectionService.getBucketImages()).toBeDefined();
    });

    it('should skip connection when already connected', async (): Promise<void> => {
      await mongoConnection.onModuleInit();
      mockConnect.mockClear();

      await mongoConnection.onModuleInit();

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should log error when connect fails', async (): Promise<void> => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});

      mockConnect.mockRejectedValueOnce(new Error('connect failed'));

      await expect(mongoConnection.onModuleInit()).rejects.toThrow('connect failed');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('MongoDb connection error'));

      errorSpy.mockRestore();
    });

    it('should sync indexes when sync models are provided', async (): Promise<void> => {
      const verboseSpy = jest.spyOn(Logger.prototype, 'verbose').mockImplementation((): void => {});
      const syncModels = [
        {
          modelName: 'TestModel',
          syncIndexes: jest.fn().mockResolvedValue(undefined),
        },
      ];

      const testModule = await Test.createTestingModule({
        providers: [MongoConnectionService, { provide: MongoOptions, useValue: { uri: mockUri } }, { provide: MONGO_SYNC_MODELS, useValue: syncModels }],
      }).compile();

      const service = testModule.get(MongoConnectionService);
      await service.onModuleInit();

      expect(verboseSpy).toHaveBeenCalledWith('TestModel: indexes synced successfully');

      verboseSpy.mockRestore();
    });

    it('should log error when syncIndexes fails', async (): Promise<void> => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
      const syncModels = [
        {
          modelName: 'FailingModel',
          syncIndexes: jest.fn().mockRejectedValue(new Error('sync failed')),
        },
      ];

      const testModule = await Test.createTestingModule({
        providers: [MongoConnectionService, { provide: MongoOptions, useValue: { uri: mockUri } }, { provide: MONGO_SYNC_MODELS, useValue: syncModels }],
      }).compile();

      const service = testModule.get(MongoConnectionService);
      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith('FailingModel: Failed to sync indexes - Error: sync failed');

      errorSpy.mockRestore();
    });
  });

  describe('onApplicationShutdown', (): void => {
    it('should disconnect when was connected', async (): Promise<void> => {
      await mongoConnection.onModuleInit();
      await mongoConnection.onApplicationShutdown();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should not call disconnect when was not connected', async (): Promise<void> => {
      await mongoConnection.onApplicationShutdown();

      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('getBucketImages', (): void => {
    it('should return GridFS bucket after init', async (): Promise<void> => {
      await mongoConnection.onModuleInit();

      const bucket = MongoConnectionService.getBucketImages();

      expect(bucket).toBeDefined();
    });

    it('should throw when bucket not initialized', (): void => {
      expect((): GridFSBucket => MongoConnectionService.getBucketImages()).toThrow('GridFSBucket not initialized');
    });
  });
});
