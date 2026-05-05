import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface IHttpErrorHandler {
  handleError(error: any): never;
}

export interface IRequestLogger {
  logRequest(config: AxiosRequestConfig): void;
  logResponse(response: AxiosResponse): void;
  logError(error: any): void;
}

export interface AxiosConfig {
  getLoggingConfig(): {
    logRequests: boolean;
    logResponses: boolean;
    logErrors: boolean;
    logHeaders: boolean;
    logBody: boolean;
  };
}
