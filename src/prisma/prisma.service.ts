import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(private configService: ConfigService) {
        const url = configService.get('DATABASE_URL') || process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not defined in environment variables.');
        }

        super({
            datasources: {
                db: {
                    url: url,
                },
            },
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
