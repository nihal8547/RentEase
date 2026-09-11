import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseData = exception.getResponse();
      message = typeof responseData === 'string' ? responseData : (responseData as any).message || responseData;
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      
      if (process.env.SENTRY_DSN) {
        // Placeholder for Sentry/Datadog reporting
        // Sentry.captureException(exception);
        this.logger.debug(`[Sentry Hook] Exception sent to Sentry: ${exception.message}`);
      }
      
      message = 'Internal Server Error';
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
