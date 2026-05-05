import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const HELLO_MESSAGE = 'Hello World!';

describe('AppController', () => {
  let controller: AppController;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue(HELLO_MESSAGE),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('returns the value from AppService.getHello', () => {
      const result = controller.getHello();

      expect(mockAppService.getHello).toHaveBeenCalledTimes(1);
      expect(result).toBe(HELLO_MESSAGE);
    });

    it('returns whatever AppService.getHello returns', () => {
      const customMessage = 'Custom greeting';
      mockAppService.getHello.mockReturnValue(customMessage);

      const result = controller.getHello();

      expect(result).toBe(customMessage);
    });
  });
});
