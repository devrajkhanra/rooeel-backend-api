import { Injectable, LoggerService, LogLevel, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
    private logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
    private context: string = 'Application';

    // ANSI color codes
    private colors = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m',
    };

    constructor() {
        const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
        if (envLogLevel) {
            this.setLogLevels(envLogLevel as LogLevel);
        }
    }

    setContext(context: string) {
        this.context = context;
    }

    setLogLevels(levels: LogLevel | LogLevel[]) {
        const levelArray: LogLevel[] = Array.isArray(levels) ? levels : [levels];
        const allLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

        // If a single level is provided, include all levels up to and including that level
        if (!Array.isArray(levels)) {
            const index = allLevels.indexOf(levels);
            if (index !== -1) {
                this.logLevels = allLevels.slice(0, index + 1);
            }
        } else {
            this.logLevels = levelArray;
        }
    }

    private formatTimestamp(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    private formatMessage(level: string, message: any, context?: string): string {
        const timestamp = this.formatTimestamp();
        const ctx = context || this.context || 'Application';
        const levelColor = this.getLevelColor(level);
        const resetColor = this.colors.reset;
        const grayColor = this.colors.gray;

        return `${grayColor}[${timestamp}]${resetColor} ${levelColor}[${level.toUpperCase()}]${resetColor} ${this.colors.cyan}[${ctx}]${resetColor} ${message}`;
    }

    private getLevelColor(level: string): string {
        switch (level.toLowerCase()) {
            case 'error':
                return this.colors.red;
            case 'warn':
                return this.colors.yellow;
            case 'log':
                return this.colors.green;
            case 'debug':
                return this.colors.blue;
            case 'verbose':
                return this.colors.magenta;
            case 'http':
                return this.colors.cyan;
            default:
                return this.colors.white;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.logLevels.includes(level);
    }

    log(message: any, context?: string) {
        if (this.shouldLog('log')) {
            console.log(this.formatMessage('log', message, context));
        }
    }

    error(message: any, trace?: string, context?: string) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, context));
            if (trace) {
                console.error(this.colors.red + trace + this.colors.reset);
            }
        }
    }

    warn(message: any, context?: string) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, context));
        }
    }

    debug(message: any, context?: string) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }

    verbose(message: any, context?: string) {
        if (this.shouldLog('verbose')) {
            console.log(this.formatMessage('verbose', message, context));
        }
    }

    // Custom method for HTTP logging
    http(message: any, context?: string) {
        if (this.shouldLog('log')) {
            console.log(this.formatMessage('http', message, context));
        }
    }
}
