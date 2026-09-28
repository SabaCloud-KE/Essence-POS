import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLoggerService, LogLevel } from '../logger/app-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly appLogger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const startTime = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Filter out simple ping/health checks if desired
    const isHealthCheck = url.includes('/health');

    return next.handle().pipe(
      tap({
        next: () => {
          if (isHealthCheck) return;

          const duration = Date.now() - startTime;
          const status = res.statusCode;
          const ip = req.ip || req.socket?.remoteAddress || 'unknown';
          const userId = (req as any).user?.id;

          const level: LogLevel =
            status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';

          const metadata: Record<string, any> = {
            method,
            path: url,
            status,
            duration: `${duration}ms`,
            ip,
          };
          if (userId) metadata.userId = userId;

          this.appLogger.log(
            level,
            'API',
            `${method} ${url} | status=${status} | duration=${duration}ms | ip=${ip}`,
            metadata,
          );
        },
        error: (err: any) => {
          if (isHealthCheck) return;

          const duration = Date.now() - startTime;
          const status = err.status || res.statusCode || 500;
          const ip = req.ip || req.socket?.remoteAddress || 'unknown';
          const userId = (req as any).user?.id;

          const level: LogLevel = status >= 500 ? 'ERROR' : 'WARN';

          const metadata: Record<string, any> = {
            method,
            path: url,
            status,
            duration: `${duration}ms`,
            ip,
            error: err.message,
          };
          if (userId) metadata.userId = userId;

          this.appLogger.log(
            level,
            status >= 500 ? 'SYSTEM' : 'API',
            `${method} ${url} | status=${status} | duration=${duration}ms | error=${err.message}`,
            metadata,
            err.stack,
          );
        },
      }),
    );
  }
}
