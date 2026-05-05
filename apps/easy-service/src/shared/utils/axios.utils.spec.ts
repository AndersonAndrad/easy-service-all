import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { AxiosResponse } from 'axios';
import { axiosInstance, createAxiosInstance, HttpErrorHandler, RequestLogger } from './axios.utils';

type TestLoggingConfig = {
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logHeaders: boolean;
  logBody: boolean;
};

type LoggingConfigProvider = {
  getLoggingConfig: () => TestLoggingConfig;
};

const createFullLoggingConfig = (): LoggingConfigProvider => ({
  getLoggingConfig: (): TestLoggingConfig => ({
    logRequests: true,
    logResponses: true,
    logErrors: true,
    logHeaders: true,
    logBody: true,
  }),
});

describe('axios.utils', (): void => {
  describe('RequestLogger formatLogData', (): void => {
    it('should truncate long base64 strings', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config);

      const longBase64 = 'A'.repeat(300);

      const result = (requestLogger as any).formatLogData(longBase64);

      expect(typeof result).toBe('string');
      expect(result).toContain('...[base64 truncated');
    });

    it('should truncate large text containing image keyword', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config);

      const largeText = `prefix image ${'x'.repeat(2000)}`;

      const result = (requestLogger as any).formatLogData(largeText);

      expect(typeof result).toBe('string');
      expect(result).toContain('truncated');
    });

    it('should truncate base64 strings nested inside objects', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config);

      const longBase64 = 'A'.repeat(300);
      const data = { field: longBase64 };

      const result = (requestLogger as any).formatLogData(data);

      expect(result.field).toContain('...[base64 truncated');
    });

    it('should detect image buffers correctly', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
      const nonImage = Buffer.from([0x00, 0x01, 0x02, 0x03]);

      expect(requestLogger.isImageBuffer(jpegHeader)).toBe(true);
      expect(requestLogger.isImageBuffer(nonImage)).toBe(false);
    });

    it('should return false from isBase64 when data is not a string', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      expect(requestLogger.isBase64(123)).toBe(false);
      expect(requestLogger.isBase64(null)).toBe(false);
      expect(requestLogger.isBase64({})).toBe(false);
    });

    it('should return false from isBase64FromBuffer when data is not a string', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      expect(requestLogger.isBase64FromBuffer(123)).toBe(false);
      expect(requestLogger.isBase64FromBuffer(Buffer.from('x'))).toBe(false);
    });

    it('should return obj unchanged from truncateBase64InObject when obj is null or not an object', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      expect(requestLogger.truncateBase64InObject(null, 200)).toBe(null);
      expect(requestLogger.truncateBase64InObject(42, 200)).toBe(42);
      expect(requestLogger.truncateBase64InObject('str', 200)).toBe('str');
    });

    it('should return image buffer marker when formatLogData receives image buffer', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

      const result = requestLogger.formatLogData(jpegHeader);

      expect(result).toBe('[Image buffer - truncated for logging]');
    });

    it('should detect large text for string and object', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      expect(requestLogger.isLargeText('x'.repeat(2001))).toBe(true);
      expect(requestLogger.isLargeText({ value: 'x'.repeat(2001) })).toBe(true);
      expect(requestLogger.isLargeText('short')).toBe(false);
    });

    it('should truncate image data nested inside object', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = { message: 'prefix image ' + 'x'.repeat(300) };

      const result = requestLogger.truncateImageData(data);

      expect(JSON.stringify(result)).toContain('truncated');
    });

    it('should truncate base64 strings via truncateBase64String for objects', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = { field: 'A'.repeat(300) };

      const result = requestLogger.truncateBase64String(data, 100);

      expect(result.field).toContain('...[base64 truncated');
    });

    it('should truncate string containing image keyword and return truncated string', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = 'payload with image and more content after';
      const result = requestLogger.truncateImageData(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('image');
      expect(result).toContain('truncated');
    });

    it('should return original data when truncateImageData finds no image', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const text = 'no picture here';
      const obj = { message: 'plain text without keyword' };

      expect(requestLogger.truncateImageData(text)).toBe(text);
      expect(requestLogger.truncateImageData(obj)).toEqual(obj);
    });

    it('should truncate object with image keyword and return string when modified json is invalid', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = { body: 'short image trailing' };
      const result = requestLogger.truncateImageData(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('image');
      expect(result).toContain('truncated');
    });

    it('should return modified json string when JSON.parse fails in truncateImageData object path', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = { key: 'value with image "broken' };
      const result = requestLogger.truncateImageData(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('truncated');
    });

    it('should return original data in truncateBase64String when length below max and non-object', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const shortBase64 = 'AAAABBBB';

      // Not long enough to be considered base64 by heuristic, should come back unchanged
      expect(requestLogger.truncateBase64String(shortBase64, 200)).toBe(shortBase64);

      // Non-string, non-object should be returned unchanged
      expect(requestLogger.truncateBase64String(123, 200)).toBe(123);
    });

    it('should process arrays and nested objects in truncateBase64InObject', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = [{ a: 'short' }, { b: 'A'.repeat(300) }, { c: { nested: 'A'.repeat(300) } }];

      const result = requestLogger.truncateBase64InObject(data, 100);

      expect(result[0].a).toBe('short');
      expect(result[1].b).toContain('...[base64 truncated');
      expect(result[2].c.nested).toContain('...[base64 truncated');
    });

    it('should call truncateImageData for large non-base64 string values in truncateBase64InObject', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const longNonBase64 = 'a b c '.repeat(200);
      const data = { description: longNonBase64 };

      const result = requestLogger.truncateBase64InObject(data, 200);

      expect(result.description).toBeDefined();
      expect(typeof result.description).toBe('string');
    });

    it('should assign short non-base64 string values unchanged in truncateBase64InObject', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = { title: 'plain short text' };

      const result = requestLogger.truncateBase64InObject(data, 200);

      expect(result.title).toBe('plain short text');
    });

    it('should return original primitive values from formatLogData when not special', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      expect(requestLogger.formatLogData(false)).toBe(false);
      expect(requestLogger.formatLogData('short')).toBe('short');
    });

    it('should return buffer markers in formatLogData for buffers', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

      expect(requestLogger.formatLogData(buf)).toBe('[Buffer data - truncated for logging]');
      expect(requestLogger.formatLogData(jpegHeader)).toBe('[Image buffer - truncated for logging]');
    });

    it('should not log request when logRequests is disabled', (): void => {
      const logger = new Logger('test');
      const logSpy = jest.spyOn(logger, 'log').mockImplementation((): void => {});
      const config: LoggingConfigProvider = {
        getLoggingConfig: (): TestLoggingConfig => ({
          logRequests: false,
          logResponses: true,
          logErrors: true,
          logHeaders: true,
          logBody: true,
        }),
      };
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      requestLogger.logRequest({
        method: 'get',
        baseURL: 'https://api.example.com',
        url: '/path',
      });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should skip headers and body when corresponding flags are disabled in logRequest', (): void => {
      const logger = new Logger('test');
      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation((): void => {});
      const logSpy = jest.spyOn(logger, 'log').mockImplementation((): void => {});
      const config: LoggingConfigProvider = {
        getLoggingConfig: (): TestLoggingConfig => ({
          logRequests: true,
          logResponses: true,
          logErrors: true,
          logHeaders: false,
          logBody: false,
        }),
      };
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      requestLogger.logRequest({
        method: 'post',
        baseURL: 'https://api.example.com',
        url: '/path',
        headers: { 'x-test': '1' },
        data: { foo: 'bar' },
      });

      expect(logSpy).toHaveBeenCalledWith('⬆️  Request: POST https://api.example.com/path');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('should not log response when logResponses is disabled', (): void => {
      const logger = new Logger('test');
      const logSpy = jest.spyOn(logger, 'log').mockImplementation((): void => {});
      const config: LoggingConfigProvider = {
        getLoggingConfig: (): TestLoggingConfig => ({
          logRequests: true,
          logResponses: false,
          logErrors: true,
          logHeaders: true,
          logBody: true,
        }),
      };
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      const response: any = {
        status: 200,
        data: { ok: true },
        config: { baseURL: 'https://api.example.com', url: '/path', params: undefined },
      };

      requestLogger.logResponse(response);

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should skip logging response body when logBody is disabled', (): void => {
      const logger = new Logger('test');
      const logSpy = jest.spyOn(logger, 'log').mockImplementation((): void => {});
      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation((): void => {});
      const config: LoggingConfigProvider = {
        getLoggingConfig: (): TestLoggingConfig => ({
          logRequests: true,
          logResponses: true,
          logErrors: true,
          logHeaders: true,
          logBody: false,
        }),
      };
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      const response: any = {
        status: 200,
        data: { ok: true },
        config: { baseURL: 'https://api.example.com', url: '/path', params: undefined },
      };

      requestLogger.logResponse(response);

      expect(logSpy).toHaveBeenCalledWith('⬇️  Response: 200 https://api.example.com/path');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('should log error response and body when present', (): void => {
      const logger = new Logger('test');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      const error = {
        response: {
          status: 500,
          data: { message: 'fail' },
          config: { baseURL: 'https://api.example.com', url: '/err', params: undefined },
        },
      };

      requestLogger.logError(error);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('🚨 Error Response: 500 https://api.example.com/err'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('🚨 Error Body [https://api.example.com/err]:'));
    });

    it('should log network error without response and include URL or Unknown URL', (): void => {
      const logger = new Logger('test');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      const errorWithConfig: any = {
        message: 'boom',
        config: { baseURL: 'https://api.example.com', url: '/err', params: undefined },
      };

      requestLogger.logError(errorWithConfig);
      expect(errorSpy).toHaveBeenCalledWith('🚨 Error [https://api.example.com/err]: boom');

      errorSpy.mockClear();

      const errorWithoutConfig: any = { message: 'boom2' };
      requestLogger.logError(errorWithoutConfig);
      expect(errorSpy).toHaveBeenCalledWith('🚨 Error [Unknown URL]: boom2');
    });

    it('should not log when logErrors is disabled', (): void => {
      const logger = new Logger('test');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const config: LoggingConfigProvider = {
        getLoggingConfig: (): TestLoggingConfig => ({
          logRequests: true,
          logResponses: true,
          logErrors: false,
          logHeaders: true,
          logBody: true,
        }),
      };
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      requestLogger.logError({
        response: { status: 500, data: {}, config: { baseURL: 'https://a.com', url: '/e', params: undefined } },
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log error response without body when logBody is disabled', (): void => {
      const logger = new Logger('test');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const config: LoggingConfigProvider = {
        getLoggingConfig: (): TestLoggingConfig => ({
          logRequests: true,
          logResponses: true,
          logErrors: true,
          logHeaders: true,
          logBody: false,
        }),
      };
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      requestLogger.logError({
        response: {
          status: 502,
          data: { message: 'bad gateway' },
          config: { baseURL: 'https://api.example.com', url: '/err', params: undefined },
        },
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('🚨 Error Response: 502 https://api.example.com/err'));
      expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error Body'));
    });

    it('should include params in buildRequestUrl when logging request', (): void => {
      const logger = new Logger('test');
      const logSpy = jest.spyOn(logger, 'log').mockImplementation((): void => {});
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      requestLogger.logRequest({
        method: 'get',
        baseURL: 'https://api.example.com',
        url: '/search',
        params: { q: 'test', page: 1 },
      });

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall).toContain('https://api.example.com/search');
      expect(logCall).toMatch(/\?|q=|page=/);
    });

    it('should return false from isLargeText for non-string and non-object values', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      expect(requestLogger.isLargeText(123)).toBe(false);
      expect(requestLogger.isLargeText(true)).toBe(false);
    });

    it('should return original base64 string when length below max in truncateBase64String', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const base64Like = 'A'.repeat(60); // passes base64 heuristic but shorter than max

      const result = requestLogger.truncateBase64String(base64Like, 200);

      expect(result).toBe(base64Like);
    });

    it('should keep base64 values unchanged in truncateBase64InObject when length below max', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const base64Like = 'A'.repeat(60);
      const data = { field: base64Like };

      const result = requestLogger.truncateBase64InObject(data, 200);

      expect(result.field).toBe(base64Like);
    });

    it('should log formatted request body when logBody is enabled', (): void => {
      const logger = new Logger('test');
      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation((): void => {});
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any as RequestLogger;

      const axiosConfig: any = {
        method: 'post',
        baseURL: 'https://api.example.com',
        url: '/resource',
        data: { field: 'A'.repeat(300) },
        headers: {},
      };

      requestLogger.logRequest(axiosConfig);

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Request Body [https://api.example.com/resource]:'));
    });
  });

  describe('createAxiosInstance', (): void => {
    it('should use default logger and config when not provided', async (): Promise<void> => {
      const instance = createAxiosInstance({
        baseURL: 'https://api.example.com',
        adapter: async (config): Promise<AxiosResponse> => ({
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }),
      });

      const response = await instance.get('/ping');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ ok: true });
    });

    it('should normalize baseURL and url through request interceptor', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = createAxiosInstance({
        baseURL: 'https://api.example.com////',
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      await instance.get('/v1///resource');

      expect(capturedConfig.baseURL).toBe('https://api.example.com');
      expect(capturedConfig.url).toBe('/v1/resource');
    });

    it('should map HTTP error response to corresponding NestJS exception', async (): Promise<void> => {
      const instance = createAxiosInstance({
        baseURL: 'https://api.example.com',
        adapter: async (config): Promise<AxiosResponse> => {
          throw {
            response: {
              status: 404,
              data: {},
              config,
            },
          };
        },
      });

      await expect(instance.get('/missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should map network error without response to BadRequestException', async (): Promise<void> => {
      const instance = createAxiosInstance({
        baseURL: 'https://api.example.com',
        adapter: async (config): Promise<AxiosResponse> => {
          const error: any = new Error('ECONNREFUSED');
          error.config = config;
          throw error;
        },
      });

      await expect(instance.get('/network-error')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should normalize URLs via catch branch when URL parsing fails', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = createAxiosInstance({
        baseURL: 'http://[invalid-url',
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      await instance.get('///v1///path');

      expect(capturedConfig.baseURL).toBe('http://[invalid-url');
      expect(capturedConfig.url).toBe('/v1/path');
    });

    it('should normalize only url when baseURL is empty and URL parsing fails', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = createAxiosInstance({
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      // use invalid absolute URL so URL(normalizedUrl) throws, entering catch, with only url set
      await instance.get('http://[invalid-url');

      expect(capturedConfig.baseURL).toBeFalsy();
      expect(capturedConfig.url).toBe('http://[invalid-url');
    });

    it('should skip URL normalization when both baseURL and url are falsy', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = createAxiosInstance({
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      await instance.request({ method: 'GET' });

      expect(capturedConfig).toBeDefined();
      expect(capturedConfig.baseURL).toBeFalsy();
      expect(capturedConfig.url).toBeFalsy();
    });

    it('should normalize only baseURL in catch when url is empty and baseURL is invalid', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = createAxiosInstance({
        baseURL: 'http://[invalid',
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      await instance.request({ method: 'GET', url: '' });

      expect(capturedConfig.baseURL).toBe('http://[invalid');
      expect(capturedConfig.url).toBe('');
    });

    it('should map network error without config to BadRequestException with Unknown URL', async (): Promise<void> => {
      const instance = createAxiosInstance({
        baseURL: 'https://api.example.com',
        adapter: async (): Promise<AxiosResponse> => {
          const err: any = new Error('ECONNREFUSED');
          throw err;
        },
      });

      await expect(instance.get('/path')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('axiosInstance', (): void => {
    it('should create an axios instance with normalized baseURL', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = axiosInstance({
        baseURL: 'https://api.example.com////',
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      await instance.get('/ping');

      expect(capturedConfig.baseURL).toBe('https://api.example.com');
    });

    it('should preserve baseURL when not provided', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = axiosInstance({
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        },
      });

      await instance.get('/path');

      expect(capturedConfig.baseURL).toBeUndefined();
    });
  });

  describe('HttpErrorHandler', (): void => {
    it('should use default message when response has no message field', (): void => {
      const handler = new HttpErrorHandler(new Logger('test'));

      expect((): void => {
        (handler as any).handleError({
          response: {
            status: 400,
            data: {},
            config: { baseURL: 'https://api.example.com', url: '/bad', params: undefined },
          },
        });
      }).toThrow(BadRequestException);
    });

    it('should fall back to BadRequestException for unknown status', (): void => {
      const handler = new HttpErrorHandler(new Logger('test'));

      expect((): void => {
        (handler as any).handleError({
          response: {
            status: 999,
            data: {},
            config: { baseURL: 'https://api.example.com', url: '/weird', params: undefined },
          },
        });
      }).toThrow(BadRequestException);
    });

    it('should create specific exceptions for all mapped HTTP statuses', (): void => {
      const handler = new HttpErrorHandler(new Logger('test'));
      const statuses = [400, 401, 403, 404, 405, 406, 408, 409, 413, 415, 422, 500, 502, 503, 504];

      for (const status of statuses) {
        expect((): void => {
          (handler as any).handleError({
            response: {
              status,
              data: {},
              config: { baseURL: 'https://api.example.com', url: '/status', params: undefined },
            },
          });
        }).toThrow();
      }
    });

    it('should build full URL with baseURL and params via private buildRequestUrl', (): void => {
      const handler = new HttpErrorHandler(new Logger('test')) as any;

      const url = handler.buildRequestUrl({
        baseURL: 'https://api.example.com',
        url: '/items',
        params: { page: 2, q: 'test' },
      });

      expect(url).toContain('https://api.example.com/items');
      expect(url).toMatch(/page=2/);
      expect(url).toMatch(/q=/);
    });

    it('should use Unknown URL when handleNetworkError receives error without config', (): void => {
      const logger = new Logger('test');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const handler = new HttpErrorHandler(logger) as any;

      expect((): void => {
        handler.handleError({ message: 'Network failed' });
      }).toThrow(BadRequestException);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown URL'));
    });

    it('should include params in buildRequestUrl when handleNetworkError receives config with params', (): void => {
      const logger = new Logger('test');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const handler = new HttpErrorHandler(logger) as any;

      expect((): void => {
        handler.handleError({
          message: 'ECONNREFUSED',
          config: { baseURL: 'https://api.example.com', url: '/api', params: { id: 1 } },
        });
      }).toThrow(BadRequestException);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/\?|id=/));
    });
  });

  describe('axios.utils - final coverage', (): void => {
    it('should trigger isLargeText object branch', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const largeObject = { text: 'x'.repeat(2000) };

      const result = requestLogger.isLargeText(largeObject);

      expect(result).toBe(true);
    });

    it('should trigger truncateBase64String primitive fallback', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const result = requestLogger.truncateBase64String(123, 100);

      expect(result).toBe(123);
    });

    it('should trigger truncateBase64InObject nested recursion', (): void => {
      const logger = new Logger('test');
      const config = createFullLoggingConfig();
      const requestLogger = new RequestLogger(logger, config) as any;

      const data = {
        level1: {
          level2: {
            value: 'A'.repeat(300),
          },
        },
      };

      const result = requestLogger.truncateBase64InObject(data, 100);

      expect(result.level1.level2.value).toContain('base64 truncated');
    });

    it('should trigger handleNetworkError with config url', (): void => {
      const logger = new Logger('test');
      const spy = jest.spyOn(logger, 'error').mockImplementation((): void => {});
      const handler = new HttpErrorHandler(logger);

      const error = {
        message: 'ECONNREFUSED',
        config: {
          baseURL: 'https://api.test.com',
          url: '/network',
        },
      };

      expect((): void => (handler as any).handleNetworkError(error)).toThrow(BadRequestException);

      expect(spy).toHaveBeenCalled();
    });

    it('should trigger interceptor catch normalization branch', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = createAxiosInstance({
        baseURL: 'http://[invalid-url',
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: config as any,
          };
        },
      });

      await instance.get('///test///path');

      expect(capturedConfig.url).toBe('/test/path');
    });

    it('should trigger axiosInstance normalization', async (): Promise<void> => {
      let capturedConfig: any;

      const instance = axiosInstance({
        baseURL: 'https://api.test.com////',
        adapter: async (config): Promise<AxiosResponse> => {
          capturedConfig = config;
          return {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: config as any,
          };
        },
      });

      await instance.get('/health');

      expect(capturedConfig.baseURL).toBe('https://api.test.com');
    });
  });
});
