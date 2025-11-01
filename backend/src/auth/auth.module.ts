import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module'; 
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RbacGuard } from './rbac.guard';
import { ModelDefinitionsModule } from '../model-definitions/model-definitions.module';

@Module({
  imports: [
    PrismaModule, 
    ModelDefinitionsModule, 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RbacGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    RbacGuard,
  ],
})
export class AuthModule {}