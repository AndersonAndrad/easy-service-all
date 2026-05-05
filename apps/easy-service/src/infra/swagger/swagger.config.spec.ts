import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger.config';

jest.mock('@nestjs/swagger', () => {
  const actual = jest.requireActual('@nestjs/swagger');

  return {
    ...actual,
    SwaggerModule: {
      createDocument: jest.fn().mockReturnValue({} as unknown),
      setup: jest.fn(),
    },
  };
});

describe('setupSwagger', () => {
  it('should configure Swagger with expected options and route', () => {
    const app = {} as INestApplication;

    setupSwagger(app);

    expect(SwaggerModule.createDocument).toHaveBeenCalledTimes(1);
    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        info: expect.objectContaining({
          title: 'Easy Service API',
          description: 'API documentation for Easy Service',
          version: '1.0',
        }),
      }),
    );

    expect(SwaggerModule.setup).toHaveBeenCalledTimes(1);
    expect(SwaggerModule.setup).toHaveBeenCalledWith('api/docs', app, expect.any(Object));
  });
});
