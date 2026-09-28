import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Optional,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(AppLoggerService)
    private readonly appLogger?: AppLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object =
      'Internal server error occurred. Please contact support.';
    let errorType = 'InternalServerError';
    let stackTrace: string | undefined;

    const ip = request.ip || request.socket?.remoteAddress || 'unknown';
    const userId = (request as any).user?.id;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || res;
        errorType = (res as any).error || exception.name;
      }
      stackTrace = exception.stack;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorType = exception.name || 'InternalServerError';
      stackTrace = exception.stack;
      // Do not leak raw internal database errors to client
      message = 'An unexpected internal error occurred. Please contact support.';
    }

    // Determine category and level for centralized plain-text log
    if (this.appLogger) {
      const meta: Record<string, any> = {
        path: request.url,
        method: request.method,
        statusCode: status,
        ip,
      };
      if (userId) meta.userId = userId;

      if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
        this.appLogger.warn(
          'SECURITY',
          `Security violation [${status}]: ${typeof message === 'object' ? JSON.stringify(message) : message}`,
          meta,
        );
      } else if (status >= 500) {
        const errorDesc =
          exception instanceof Error ? exception.message : 'Internal Server Error';
        this.appLogger.error(
          'SYSTEM',
          `Server Exception [${status}]: ${errorDesc}`,
          meta,
          stackTrace,
        );
      } else {
        this.appLogger.warn(
          'API',
          `HTTP Request Error [${status}]: ${typeof message === 'object' ? JSON.stringify(message) : message}`,
          meta,
        );
      }
    } else {
      // Fallback console log if logger service is not injected
      if (status >= 500) {
        console.error(
          `[HttpExceptionFilter] ${request.method} ${request.url} - ${status}`,
          stackTrace,
        );
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: errorType,
      message,
    });
  }
}
