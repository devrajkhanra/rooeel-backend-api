import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';

/**
 * Global Redis-backed cache module.
 *
 * Powered by cache-manager v6 + @keyv/redis.
 * Inject CacheManager anywhere via: @Inject(CACHE_MANAGER) cache: Cache
 *
 * Usage example:
 *   await this.cache.set('key', value, ttl_ms);
 *   const val = await this.cache.get<MyType>('key');
 *   await this.cache.del('key');
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');
        const ttl = config.get<number>('REDIS_TTL', 300) * 1000; // cache-manager v6 uses ms

        const redisUrl = password
          ? `redis://:${password}@${host}:${port}`
          : `redis://${host}:${port}`;

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class RedisModule {}
