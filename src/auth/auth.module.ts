import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthResolver } from './auth.resolver';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { AdminModule } from '../admin/admin.module';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectPermissionGuard } from './guards/project-permission.guard';
import { RestAuthGuard } from './guards/rest-auth.guard';
import { RestAdminGuard } from './guards/rest-admin.guard';

@Module({
    imports: [
        UserModule,
        AdminModule,
        CommonModule,
        PrismaModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthResolver,
        JwtStrategy,
        ProjectPermissionGuard,
        RestAuthGuard,
        RestAdminGuard,
    ],
    exports: [
        AuthService,
        ProjectPermissionGuard,
        RestAuthGuard,
        RestAdminGuard,
        JwtModule,
    ],
})
export class AuthModule { }