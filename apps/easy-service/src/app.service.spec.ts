import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

const HELLO_MESSAGE = 'Hello World!';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('returns the default greeting message', () => {
      const result = service.getHello();

      expect(result).toBe(HELLO_MESSAGE);
    });

    it('returns a string', () => {
      const result = service.getHello();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
