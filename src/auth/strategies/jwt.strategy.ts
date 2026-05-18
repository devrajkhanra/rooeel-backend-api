import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export const jwtConstants = {
    secret: 'secretKey',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET') || jwtConstants.secret,
        });
    }

    async validate(payload: any) {
        if (payload.jti) {
            const isBlacklisted = await this.cacheManager.get(`blacklist:${payload.jti}`);
            if (isBlacklisted) {
                throw new UnauthorizedException('Token has been revoked');
            }
        }
        return { userId: payload.sub, email: payload.email, role: payload.role, jti: payload.jti };
    }
}
