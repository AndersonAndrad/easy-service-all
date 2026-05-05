import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

const HELLO_MESSAGE = 'Hello World!';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  describe('GET /', () => {
    it('returns 200 and the greeting message', async () => {
      const response = await request(app.getHttpServer()).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toBe(HELLO_MESSAGE);
    });
  });
});
