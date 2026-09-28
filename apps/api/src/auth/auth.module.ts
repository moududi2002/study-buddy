// ============================================================
// Path: apps/api/src/auth/auth.module.ts
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies';
import { SignOptions } from 'jsonwebtoken';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<string>(
            'JWT_EXPIRES_IN',
            '15m',
        ) as SignOptions['expiresIn'];

        return {
            secret: config.get<string>('JWT_SECRET'),
            signOptions: {
            expiresIn,
                },
            };
        },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy],
  exports: [AuthService, OtpService],
})
export class AuthModule {}