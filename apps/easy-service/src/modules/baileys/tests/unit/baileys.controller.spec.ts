import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { SocketHandshakeGuard } ../../app/baileys.servicedshake.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { BaileysService } from '../../app/services/baileys.service';
import { BaileysController } from '../../rest/baileys.controller';

jest.mock('../../app/services/baileys.service', () => ({
  BaileysService: jest.fn(),
}));

describe('BaileysController', () => {
  let controller: BaileysController;
  let baileysService: jest.Mocked<BaileysService>;

  const mockBaileysService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BaileysController],
      providers: [{ provide: BaileysService, useValue: mockBaileysService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(SocketHandshakeGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(WorkspaceAccessGuard)
      .useValue({ canActivate: (): boolean => true })
      .compile();

    controller = module.get<BaileysController>(BaileysController);
    baileysService = module.get(BaileysService);
  });

  describe('sendMessage', () => {
    it('calls service sendMessage with body and returns result', async () => {
      const body = { phone: '5521961234567', message: 'Hello' };
      const expected = {
        success: true,
        from: '5511961234567@s.whatsapp.net',
        to: '5521961234567@s.whatsapp.net',
      };
      mockBaileysService.sendMessage.mockResolvedValue(expected);

      const result = await controller.sendMessage(body);

      expect(baileysService.sendMessage).toHaveBeenCalledWith(
        body.phone,
        body.message,
      );
      expect(result).toEqual(expected);
    });
  });
});
