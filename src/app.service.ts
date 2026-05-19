import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  getLiveness() {
    return {
      status: 'ok',
      service: 'rooeel-backend-api',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks = {
      database: false,
      cache: false,
      storage: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      const key = `health:${Date.now()}`;
      await this.cacheManager.set(key, 'ok', 5000);
      const value = await this.cacheManager.get(key);
      checks.cache = value === 'ok';
    } catch {
      checks.cache = false;
    }

    const useMinio = this.configService.get<string>('USE_MINIO') === 'true';
    if (useMinio) {
      checks.storage = !!(
        this.configService.get<string>('MINIO_ROOT_USER') &&
        this.configService.get<string>('MINIO_ROOT_PASSWORD') &&
        this.configService.get<string>('MINIO_BUCKET')
      );
    } else {
      checks.storage = !!(
        this.configService.get<string>('AWS_ACCESS_KEY_ID') &&
        this.configService.get<string>('AWS_SECRET_ACCESS_KEY') &&
        this.configService.get<string>('AWS_REGION') &&
        this.configService.get<string>('MINIO_BUCKET')
      );
    }

    const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';
    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
