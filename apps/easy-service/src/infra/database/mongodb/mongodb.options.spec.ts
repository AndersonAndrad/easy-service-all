import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoOptions } from './mongodb.options';

describe('MongoOptions', (): void => {
  const validUri = 'mongodb://localhost:27017/test';

  describe('when MONGODB_URI is set', (): void => {
    it('should set uri from config', async (): Promise<void> => {
      const configService = { get: jest.fn().mockReturnValue(validUri) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [MongoOptions, { provide: ConfigService, useValue: configService }],
      }).compile();

      const options = module.get(MongoOptions);

      expect(options.uri).toBe(validUri);
      expect(configService.get).toHaveBeenCalledWith('MONGODB_URI');
    });
  });

  describe('when MONGODB_URI is not set', (): void => {
    it('should throw on construction', (): void => {
      const configService = { get: jest.fn().mockReturnValue(undefined) };

      expect((): MongoOptions => {
        return new MongoOptions(configService as unknown as ConfigService);
      }).toThrow('MongoOptions requires uri');
    });
  });

  describe('when MONGODB_URI is empty string', (): void => {
    it('should throw on construction', (): void => {
      const configService = { get: jest.fn().mockReturnValue('') };

      expect((): MongoOptions => {
        return new MongoOptions(configService as unknown as ConfigService);
      }).toThrow('MongoOptions requires uri');
    });
  });

  describe('when MONGODB_URI is null', (): void => {
    it('should throw on construction', (): void => {
      const configService = { get: jest.fn().mockReturnValue(null) };

      expect((): MongoOptions => {
        return new MongoOptions(configService as unknown as ConfigService);
      }).toThrow('MongoOptions requires uri');
    });
  });
});
