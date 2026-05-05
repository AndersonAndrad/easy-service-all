import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  InternalServerErrorException,
  Logger,
  MethodNotAllowedException,
  NotAcceptableException,
  NotFoundException,
  PayloadTooLargeException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CreateAxiosDefaults } from 'axios';

import qs from 'qs';
import { AxiosConfig, IHttpErrorHandler, IRequestLogger } from '../types/interfaces/axios.interface';
import { normalizeCompleteUrl, normalizeUrl } from './http.utils';

class AxiosLoggingConfig implements AxiosConfig {
  getLoggingConfig(): {
    logRequests: boolean;
    logResponses: boolean;
    logErrors: boolean;
    logHeaders: boolean;
    logBody: boolean;
  } {
    return {
      logRequests: true,
      logResponses: true,
      logErrors: true,
      logHeaders: true,
      logBody: true,
    };
  }
}

export class RequestLogger implements IRequestLogger {
  private readonly logger: Logger;
  private readonly config: AxiosConfig;

  constructor(logger: Logger, config: AxiosConfig) {
    this.logger = logger;
    this.config = config;
  }

  private isBase64(data: any): boolean {
    if (typeof data !== 'string') return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(data) && data.length > 50;
  }

  private isBuffer(data: any): boolean {
    return Buffer.isBuffer(data);
  }

  private isBase64FromBuffer(data: any): boolean {
    if (typeof data !== 'string') return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(data) && data.length > 50;
  }

  private isImageBuffer(data: any): boolean {
    if (Buffer.isBuffer(data)) {
      const bufferHeader = data.toString('hex', 0, 4);
      const imageSignatures = ['ffd8ff', '89504e47', '47494638', '424d'];
      return imageSignatures.some((sig: string): boolean => bufferHeader.startsWith(sig));
    }
    return false;
  }

  private isLargeText(data: any): boolean {
    if (typeof data === 'string') return data.length > 1000;
    if (typeof data === 'object' && data !== null) {
      const jsonString = JSON.stringify(data);
      return jsonString.length > 1000;
    }
    return false;
  }

  private truncateImageData(data: any): any {
    if (typeof data === 'string') {
      const imageIndex = data.toLowerCase().indexOf('image');
      if (imageIndex !== -1) {
        const afterImage = data.substring(imageIndex + 5);
        const truncated = afterImage.substring(0, 40);
        return data.substring(0, imageIndex + 5) + `[${truncated}...truncated]`;
      }
    }

    if (typeof data === 'object' && data !== null) {
      const jsonString = JSON.stringify(data);
      const imageIndex = jsonString.toLowerCase().indexOf('image');
      if (imageIndex !== -1) {
        const afterImage = jsonString.substring(imageIndex + 5);
        const truncated = afterImage.substring(0, 40);
        const modifiedJson = jsonString.substring(0, imageIndex + 5) + `[${truncated}...truncated]`;
        try {
          return JSON.parse(modifiedJson);
        } catch {
          return modifiedJson;
        }
      }
    }

    return data;
  }

  private truncateBase64String(data: any, maxLength: number = 200): any {
    if (typeof data === 'string' && this.isBase64FromBuffer(data)) {
      if (data.length > maxLength) {
        const truncated = data.substring(0, maxLength);
        return `${truncated}...[base64 truncated, original length: ${data.length}]`;
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      return this.truncateBase64InObject(data, maxLength);
    }

    return data;
  }

  private truncateBase64InObject(obj: any, maxLength: number): any {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item): any => this.truncateBase64InObject(item, maxLength));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        if (this.isBase64(value) || this.isBase64FromBuffer(value)) {
          if (value.length > maxLength) {
            result[key] = `${value.substring(0, maxLength)}...[base64 truncated, original length: ${value.length}]`;
          } else {
            result[key] = value;
          }
        } else if (this.isLargeText(value)) {
          result[key] = this.truncateImageData(value);
        } else {
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.truncateBase64InObject(value, maxLength);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private formatLogData(data: any): any {
    if (this.isImageBuffer(data)) return '[Image buffer - truncated for logging]';
    if (this.isBuffer(data)) return '[Buffer data - truncated for logging]';

    if (typeof data === 'object' && data !== null) return this.truncateBase64InObject(data, 200);

    if (typeof data === 'string') {
      if (this.isBase64(data) || this.isBase64FromBuffer(data)) return this.truncateBase64String(data, 200);
      if (this.isLargeText(data)) return this.truncateImageData(data);
    }

    return data;
  }

  logRequest(config: AxiosRequestConfig): void {
    const loggingConfig = this.config.getLoggingConfig();
    if (!loggingConfig.logRequests) return;
    const fullUrl = this.buildRequestUrl(config);
    this.logger.log(`⬆️  Request: ${config.method?.toUpperCase()} ${fullUrl}`);
    if (loggingConfig.logHeaders) {
      this.logger.debug(`⬆️  Headers [${fullUrl}]: ${JSON.stringify(config.headers, null, 2)}`);
    }
    if (loggingConfig.logBody && config?.data) {
      const formattedData = this.formatLogData(config.data);
      this.logger.debug(`⬆️  Request Body [${fullUrl}]: ${JSON.stringify(formattedData, null, 2)}`);
    }
  }

  logResponse(response: AxiosResponse): void {
    const loggingConfig = this.config.getLoggingConfig();
    if (!loggingConfig.logResponses) return;
    const fullUrl = this.buildRequestUrl(response.config);
    this.logger.log(`⬇️  Response: ${response.status} ${fullUrl}`);
    if (loggingConfig.logBody) {
      const formattedData = this.formatLogData(response.data);
      this.logger.debug(`⬇️  Response Body [${fullUrl}]: ${JSON.stringify(formattedData, null, 2)}`);
    }
  }

  logError(error: any): void {
    const loggingConfig = this.config.getLoggingConfig();
    if (!loggingConfig.logErrors) return;
    if (error.response) {
      const { status, config, data } = error.response;
      const fullUrl = this.buildRequestUrl(config);
      this.logger.error(`🚨 Error Response: ${status} ${fullUrl}`);
      if (loggingConfig.logBody) {
        const formattedData = this.formatLogData(data);
        this.logger.error(`🚨 Error Body [${fullUrl}]: ${JSON.stringify(formattedData, null, 2)}`);
      }
    } else {
      const fullUrl = error.config ? this.buildRequestUrl(error.config) : 'Unknown URL';
      this.logger.error(`🚨 Error [${fullUrl}]: ${error.message}`);
    }
  }

  private buildRequestUrl(config: AxiosRequestConfig): string {
    const baseUrl = config.baseURL || '';
    const url = config.url || '';
    const params = config.params ? '?' + qs.stringify(config.params, { arrayFormat: 'brackets' }) : '';
    return `${baseUrl}${url}${params}`;
  }
}

export class HttpErrorHandler implements IHttpErrorHandler {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private buildRequestUrl(config: AxiosRequestConfig): string {
    const baseUrl = config.baseURL || '';
    const url = config.url || '';
    const params = config.params ? '?' + qs.stringify(config.params, { arrayFormat: 'brackets' }) : '';
    return `${baseUrl}${url}${params}`;
  }

  handleError(error: any): never {
    if (error.response) {
      this.handleHttpError(error.response);
    } else {
      this.handleNetworkError(error);
    }
  }

  private handleHttpError(response: any): never {
    const { status, data } = response;
    const message = data?.message || this.getDefaultErrorMessage(status);
    const exception = this.createExceptionForStatus(status, message, data);
    throw exception;
  }

  private handleNetworkError(error: any): never {
    const fullUrl = error.config ? this.buildRequestUrl(error.config) : 'Unknown URL';
    this.logger.error(`🚨 Network Error [${fullUrl}]: ${error.message}`);
    throw new BadRequestException({
      statusCode: 400,
      message: `Network Error: ${error.message}`,
      response: null,
    });
  }

  private createExceptionForStatus(status: number, message: string, responseData: any): any {
    const payload = { statusCode: status, message, response: responseData };

    const statusExceptionMap: Record<number, () => any> = {
      400: (): BadRequestException => new BadRequestException(payload),
      401: (): UnauthorizedException => new UnauthorizedException(payload),
      403: (): ForbiddenException => new ForbiddenException(payload),
      404: (): NotFoundException => new NotFoundException(payload),
      405: (): MethodNotAllowedException => new MethodNotAllowedException(payload),
      406: (): NotAcceptableException => new NotAcceptableException(payload),
      408: (): RequestTimeoutException => new RequestTimeoutException(payload),
      409: (): ConflictException => new ConflictException(payload),
      413: (): PayloadTooLargeException => new PayloadTooLargeException(payload),
      415: (): UnsupportedMediaTypeException => new UnsupportedMediaTypeException(payload),
      422: (): UnprocessableEntityException => new UnprocessableEntityException(payload),
      500: (): InternalServerErrorException => new InternalServerErrorException(payload),
      502: (): BadRequestException => new BadRequestException(payload),
      503: (): ServiceUnavailableException => new ServiceUnavailableException(payload),
      504: (): GatewayTimeoutException => new GatewayTimeoutException(payload),
    };

    const exceptionFactory = statusExceptionMap[status];
    return exceptionFactory ? exceptionFactory() : new BadRequestException(payload);
  }

  private getDefaultErrorMessage(status: number): string {
    const defaultMessages: Record<number, string> = {
      400: 'Invalid request data',
      401: 'Authentication required',
      403: 'Access denied',
      404: 'Resource not found',
      405: 'HTTP method not supported',
      406: 'Request not acceptable',
      408: 'Request timed out',
      409: 'Resource conflict',
      413: 'Request entity too large',
      415: 'Media type not supported',
      422: 'Validation failed',
      500: 'Server error occurred',
      502: 'Bad gateway',
      503: 'Service temporarily unavailable',
      504: 'Gateway timeout',
    };
    return defaultMessages[status] || 'Request failed';
  }
}

class AxiosInstanceFactory {
  private readonly logger: Logger;
  private readonly requestLogger: RequestLogger;
  private readonly errorHandler: HttpErrorHandler;

  constructor(logger: Logger, requestLogger: RequestLogger, errorHandler: HttpErrorHandler) {
    this.logger = logger;
    this.requestLogger = requestLogger;
    this.errorHandler = errorHandler;
  }

  createInstance(axiosParams: CreateAxiosDefaults): AxiosInstance {
    const instance: AxiosInstance = axios.create(axiosParams);
    this.setupRequestInterceptor(instance);
    this.setupResponseInterceptor(instance);
    return instance;
  }

  private setupRequestInterceptor(instance: AxiosInstance): void {
    instance.interceptors.request.use((config: AxiosRequestConfig): any => {
      if (config.baseURL || config.url) {
        const normalizedUrl = normalizeCompleteUrl(config.baseURL || '', config.url || '');
        try {
          const urlObj = new URL(normalizedUrl);
          config.baseURL = `${urlObj.protocol}//${urlObj.host}`;
          config.url = urlObj.pathname + urlObj.search + urlObj.hash;
        } catch {
          if (config.baseURL) config.baseURL = normalizeUrl(config.baseURL);
          if (config.url) config.url = normalizeUrl(config.url);
        }
      }
      this.requestLogger.logRequest(config);
      return config;
    });
  }

  private setupResponseInterceptor(instance: AxiosInstance): void {
    instance.interceptors.response.use(
      (response: AxiosResponse): AxiosResponse => {
        this.requestLogger.logResponse(response);
        return response;
      },
      (error: any): never => {
        this.requestLogger.logError(error);
        this.errorHandler.handleError(error);
      },
    );
  }
}

export const createAxiosInstance = (axiosParams: CreateAxiosDefaults, logger?: Logger, config?: AxiosConfig): AxiosInstance => {
  const defaultLogger: Logger = logger || new Logger('AxiosInstance');
  const defaultConfig = config || new AxiosLoggingConfig();
  const requestLogger = new RequestLogger(defaultLogger, defaultConfig);
  const errorHandler = new HttpErrorHandler(defaultLogger);
  const factory = new AxiosInstanceFactory(defaultLogger, requestLogger, errorHandler);
  const normalizedParams = {
    ...axiosParams,
    baseURL: axiosParams.baseURL ? normalizeUrl(axiosParams.baseURL) : axiosParams.baseURL,
  };
  return factory.createInstance(normalizedParams);
};

export const axiosInstance = (axiosParams: CreateAxiosDefaults): AxiosInstance => {
  const normalizedParams = {
    ...axiosParams,
    baseURL: axiosParams.baseURL ? normalizeUrl(axiosParams.baseURL) : axiosParams.baseURL,
  };
  return createAxiosInstance(normalizedParams);
};
