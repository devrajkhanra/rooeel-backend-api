import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLogger } from './logger.service';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
    private readonly logger: CustomLogger;

    constructor() {
        this.logger = new CustomLogger();
        this.logger.setContext('HTTP');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const { method, url, ip } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();

        // Skip health check endpoints
        if (url === '/' || url === '/health') {
            return next.handle();
        }

        this.logger.http(`→ ${method} ${url} from ${ip}`);

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse();
                    const { statusCode } = response;
                    const duration = Date.now() - startTime;
                    const statusColor = this.getStatusColor(statusCode);
                    const resetColor = '\x1b[0m';

                    this.logger.http(
                        `← ${method} ${url} ${statusColor}${statusCode}${resetColor} - ${duration}ms`,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;
                    const statusColor = this.getStatusColor(statusCode);
                    const resetColor = '\x1b[0m';

                    this.logger.http(
                        `← ${method} ${url} ${statusColor}${statusCode}${resetColor} - ${duration}ms`,
                    );
                },
            }),
        );
    }

    private getStatusColor(statusCode: number): string {
        if (statusCode >= 500) return '\x1b[31m'; // Red
        if (statusCode >= 400) return '\x1b[33m'; // Yellow
        if (statusCode >= 300) return '\x1b[36m'; // Cyan
        if (statusCode >= 200) return '\x1b[32m'; // Green
        return '\x1b[37m'; // White
    }
}
