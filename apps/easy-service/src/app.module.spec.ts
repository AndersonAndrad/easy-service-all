import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtService } from './infra/auth/jwt/app/jwt.service';

jest.mock('@whiskeysockets/baileys', () => ({
  __esModule: true,
  default: jest.fn(() => ({ ev: { on: jest.fn() } })),
  DisconnectReason: {},
  fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 2323, 4] }),
  useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
}));

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtService)
      .useValue({
        generateToken: jest.fn(),
        refreshToken: jest.fn(),
        invalidToken: jest.fn(),
        validateToken: jest.fn(),
      })
      .compile();
  });

  it('compiles successfully', () => {
    expect(module).toBeDefined();
  });

  it('provides AppController', () => {
    const controller = module.get<AppController>(AppController);
    expect(controller).toBeDefined();
  });

  it('provides AppService', () => {
    const service = module.get<AppService>(AppService);
    expect(service).toBeDefined();
  });
});
